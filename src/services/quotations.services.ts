import * as bundlesRepository from '../repositories/bundles.repository';
import * as featuresRepository from '../repositories/features.repository';
import * as quotationsRepository from '../repositories/quotations.repository';
import * as projectsService from './projects.services';
import type { ProjectDTO } from './projects.services';
import type { Pagination, Requester } from '../types/common';
import { AppError, roundMoney, toCents } from '../utils/helper';

export interface QuotationItemDTO {
  quotationItemId: number;
  featureId: number | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface QuotationDTO {
  quotationId: number;
  clientId: number;
  bundleId: number | null;
  quotationType: 'Fixed' | 'Manual';
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: quotationsRepository.QuotationStatus;
  approvedAt: Date | null;
  createdAt: Date;
}

export interface QuotationWithItemsDTO extends QuotationDTO {
  items: QuotationItemDTO[];
}

const toQuotationDTO = (row: quotationsRepository.QuotationRow): QuotationDTO => ({
  quotationId: row.quotation_id,
  clientId: row.client_id,
  bundleId: row.bundle_id,
  quotationType: row.quotation_type,
  subtotal: Number(row.subtotal),
  discount: Number(row.discount),
  tax: Number(row.tax),
  grandTotal: Number(row.grand_total),
  status: row.status,
  approvedAt: row.approved_at,
  createdAt: row.created_at,
});

const toQuotationItemDTO = (row: quotationsRepository.QuotationItemRow): QuotationItemDTO => ({
  quotationItemId: row.quotation_item_id,
  featureId: row.feature_id,
  itemName: row.item_name,
  quantity: row.quantity,
  unitPrice: Number(row.unit_price),
  subtotal: Number(row.subtotal),
});

const fetchQuotationWithItems = async (quotationId: number): Promise<QuotationWithItemsDTO> => {
  const quotation = await quotationsRepository.findQuotationById(quotationId);
  if (!quotation) {
    throw new AppError('Quotation not found', 404, 'QUOTATION');
  }
  const items = await quotationsRepository.findQuotationItems(quotationId);
  return { ...toQuotationDTO(quotation), items: items.map(toQuotationItemDTO) };
};

export interface CreateQuotationInput {
  bundleId: number;
  extraFeatureIds?: number[];
}

export const createQuotation = async (
  clientId: number,
  input: CreateQuotationInput,
): Promise<QuotationWithItemsDTO> => {
  const bundle = await bundlesRepository.findBundleById(input.bundleId);
  if (!bundle) {
    throw new AppError('Bundle not found', 404, 'QUOTATION');
  }
  if (!bundle.is_active) {
    throw new AppError('Bundle is not available', 409, 'QUOTATION');
  }

  const bundleFeatures = await bundlesRepository.findBundleFeatures(bundle.bundle_id);
  const bundleFeatureIds = new Set(bundleFeatures.map((feature) => feature.feature_id));

  const requestedExtraIds = Array.from(new Set(input.extraFeatureIds ?? []));
  const extraFeatureIds = requestedExtraIds.filter((id) => !bundleFeatureIds.has(id));

  const extraFeatures =
    extraFeatureIds.length > 0 ? await featuresRepository.findFeaturesByIds(extraFeatureIds) : [];
  if (extraFeatures.length !== extraFeatureIds.length) {
    throw new AppError('One or more features not found', 404, 'QUOTATION');
  }

  const items: quotationsRepository.CreateQuotationItemInput[] = [];

  if (bundle.pricing_type === 'Fixed') {
    const bundlePrice = bundle.price !== null ? Number(bundle.price) : 0;
    items.push({
      featureId: null,
      itemName: bundle.bundle_name,
      quantity: 1,
      unitPrice: bundlePrice,
      subtotal: bundlePrice,
    });
  } else {
    for (const feature of bundleFeatures) {
      const unitPrice = Number(feature.price);
      items.push({
        featureId: feature.feature_id,
        itemName: feature.feature_name,
        quantity: 1,
        unitPrice,
        subtotal: unitPrice,
      });
    }
  }

  for (const feature of extraFeatures) {
    const unitPrice = Number(feature.price);
    items.push({
      featureId: feature.feature_id,
      itemName: feature.feature_name,
      quantity: 1,
      unitPrice,
      subtotal: unitPrice,
    });
  }

  const subtotalCents = items.reduce((sum, item) => sum + toCents(item.subtotal), 0);
  const subtotal = roundMoney(subtotalCents / 100);

  const quotationId = await quotationsRepository.createQuotationTx(
    {
      clientId,
      bundleId: bundle.bundle_id,
      quotationType: bundle.pricing_type,
      subtotal,
      discount: 0,
      tax: 0,
      grandTotal: subtotal,
      status: 'Pending',
    },
    items,
  );

  return fetchQuotationWithItems(quotationId);
};

export interface PaginatedQuotations {
  quotations: QuotationDTO[];
  pagination: Pagination;
}

export interface ListQuotationsFilters {
  status?: quotationsRepository.QuotationStatus;
  clientId?: number;
}

export const listQuotations = async (
  page: number,
  limit: number,
  filters: ListQuotationsFilters,
): Promise<PaginatedQuotations> => {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    quotationsRepository.findQuotationsList(limit, offset, filters),
    quotationsRepository.countQuotations(filters),
  ]);

  return {
    quotations: rows.map(toQuotationDTO),
    pagination: { page, limit, total },
  };
};

export const getQuotationById = async (
  quotationId: number,
  requester: Requester,
): Promise<QuotationWithItemsDTO> => {
  const quotation = await fetchQuotationWithItems(quotationId);
  if (requester.role === 'client' && quotation.clientId !== requester.userId) {
    throw new AppError('Quotation not found', 404, 'QUOTATION');
  }
  return quotation;
};

export interface UpdateQuotationStatusInput {
  status: 'Approved' | 'Rejected' | 'Expired';
  discount?: number;
  tax?: number;
}

export interface UpdateQuotationStatusResult {
  quotation: QuotationWithItemsDTO;
  project: ProjectDTO | null;
}

export const updateQuotationStatus = async (
  quotationId: number,
  input: UpdateQuotationStatusInput,
): Promise<UpdateQuotationStatusResult> => {
  const quotation = await quotationsRepository.findQuotationById(quotationId);
  if (!quotation) {
    throw new AppError('Quotation not found', 404, 'QUOTATION');
  }
  if (quotation.status !== 'Pending') {
    throw new AppError('Quotation already finalized', 409, 'QUOTATION');
  }

  const subtotal = Number(quotation.subtotal);
  const discount = input.discount !== undefined ? input.discount : Number(quotation.discount);
  const tax = input.tax !== undefined ? input.tax : Number(quotation.tax);

  const grandTotalCents = toCents(subtotal) - toCents(discount) + toCents(tax);
  if (grandTotalCents < 0) {
    throw new AppError('Discount exceeds subtotal and tax', 422, 'QUOTATION');
  }
  const grandTotal = roundMoney(grandTotalCents / 100);

  let projectInput: { projectName: string; startDate: string } | null = null;
  if (input.status === 'Approved') {
    const bundle =
      quotation.bundle_id !== null
        ? await bundlesRepository.findBundleById(quotation.bundle_id)
        : null;
    const projectName = bundle
      ? `${bundle.bundle_name} Project`
      : `Project for Quotation #${quotationId}`;
    const startDate = new Date().toISOString().slice(0, 10);
    projectInput = { projectName, startDate };
  }

  const { projectId } = await quotationsRepository.updateQuotationStatusTx(
    quotationId,
    {
      status: input.status,
      discount: roundMoney(discount),
      tax: roundMoney(tax),
      grandTotal,
      approvedAt: input.status === 'Approved' ? new Date() : null,
    },
    projectInput,
  );

  const updatedQuotation = await fetchQuotationWithItems(quotationId);

  const project =
    projectId !== null
      ? await projectsService.getProjectById(projectId, {
          userId: quotation.client_id,
          role: 'admin',
        })
      : null;

  return { quotation: updatedQuotation, project };
};

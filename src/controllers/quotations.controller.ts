import * as quotationsService from '../services/quotations.services';
import { catchAsync, getRequester, parsePagination } from '../utils/http';

export const createQuotation = catchAsync(async (req, res) => {
  const quotation = await quotationsService.createQuotation(Number(req.user!.sub), req.body);
  res.status(201).json({ success: true, message: 'Quotation created', data: { quotation } });
});

export const listQuotations = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req);
  const status = req.query.status
    ? (String(req.query.status) as 'Pending' | 'Approved' | 'Rejected' | 'Expired')
    : undefined;
  const role = req.user!.role;
  const clientId =
    role === 'client'
      ? Number(req.user!.sub)
      : req.query.clientId !== undefined
        ? Number(req.query.clientId)
        : undefined;

  const data = await quotationsService.listQuotations(page, limit, { status, clientId });
  res.status(200).json({ success: true, message: 'Quotations retrieved', data });
});

export const getQuotationById = catchAsync(async (req, res) => {
  const quotation = await quotationsService.getQuotationById(
    Number(req.params.id),
    getRequester(req),
  );
  res.status(200).json({ success: true, message: 'Quotation retrieved', data: { quotation } });
});

export const updateQuotationStatus = catchAsync(async (req, res) => {
  const { quotation, project } = await quotationsService.updateQuotationStatus(
    Number(req.params.id),
    req.body,
  );
  res
    .status(200)
    .json({ success: true, message: 'Quotation status updated', data: { quotation, project } });
});

import { Router } from 'express';
import multer from 'multer';
import type { ReceiptService } from './receipt.service.js';
import type { JwtService } from '@receiptflow/auth/jwt';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { receiptQuerySchema, updateReceiptSchema } from '@receiptflow/shared/validators';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_UPLOAD } from '@receiptflow/shared/constants';
import { ValidationError } from '@receiptflow/shared/errors';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES_PER_UPLOAD },
  fileFilter(_req, file, callback) {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as never)) {
      callback(null, true);
    } else {
      callback(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

export function createReceiptRouter(receiptService: ReceiptService, jwtService: JwtService): Router {
  const router = Router();
  const auth = authenticate(jwtService);

  // GET /receipts
  router.get('/', auth, validate(receiptQuerySchema, 'query'), asyncHandler(async (req, res) => {
    const orgId = req.query['organizationId'] as string;
    const result = await receiptService.getReceipts({
      ...(req.query as Parameters<ReceiptService['getReceipts']>[0]),
      organizationId: orgId,
      tenantId: req.tenantId!,
    });
    res.json({ success: true, ...result });
  }));

  // POST /receipts/upload — multipart
  router.post('/upload', auth, upload.array('files', MAX_FILES_PER_UPLOAD), asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) throw new ValidationError('No files provided');

    const orgId = (req.body as { organizationId?: string }).organizationId;
    if (!orgId) throw new ValidationError('organizationId is required');

    const result = await receiptService.uploadReceipts({
      organizationId: orgId,
      tenantId: req.tenantId!,
      uploadedById: req.auth!.sub,
      files: files.map((f) => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        buffer: f.buffer,
        size: f.size,
      })),
    });
    res.status(202).json({ success: true, data: result });
  }));

  // POST /receipts/presign — get presigned upload URL
  router.post('/presign', auth, asyncHandler(async (req, res) => {
    const { organizationId, filename, mimeType } = req.body as {
      organizationId: string;
      filename: string;
      mimeType: string;
    };
    const result = await receiptService.getPresignedUploadUrl(
      req.tenantId!,
      organizationId,
      filename,
      mimeType,
    );
    res.json({ success: true, data: result });
  }));

  // GET /receipts/:id
  router.get('/:id', auth, asyncHandler(async (req, res) => {
    const { organizationId } = req.query as { organizationId: string };
    const data = await receiptService.getReceiptById(req.params['id']!, req.tenantId!, organizationId);
    res.json({ success: true, data });
  }));

  // DELETE /receipts/:id
  router.delete('/:id', auth, asyncHandler(async (req, res) => {
    const { organizationId } = req.query as { organizationId: string };
    await receiptService.deleteReceipt(req.params['id']!, req.tenantId!, organizationId, req.auth!.sub);
    res.json({ success: true });
  }));

  return router;
}

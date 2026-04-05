import { Router } from "express";
import { guardRole } from "../../middlewares/roleGuard";
import {
  createInvoiceController,
  sendInvoiceController,
  createRenewalInvoiceController,
  getMyInvoicesController,
  getTrainerInvoicesController,
  getInvoiceByIdController,
} from "./invoice.controller";

const router = Router();

// ── User routes ───────────────────────────────────────────────
// GET /invoices/my          → user sees received invoices
// GET /invoices/:id         → single invoice + PDF url

router.get("/my", guardRole("user"), getMyInvoicesController);

// ── Trainer routes ────────────────────────────────────────────
// POST  /invoices              → create invoice (generates PDF)
// POST  /invoices/renewal      → create renewal invoice
// PATCH /invoices/:id/send     → send invoice to user
// GET   /invoices/trainer      → trainer sees all their invoices

router.post("/", guardRole("trainer"), createInvoiceController);
router.post("/renewal", guardRole("trainer"), createRenewalInvoiceController);
router.get("/trainer", guardRole("trainer"), getTrainerInvoicesController);
router.patch("/:id/send", guardRole("trainer"), sendInvoiceController);

// ── Shared (user or trainer can access their own) ─────────────
router.get("/:id", guardRole(["user", "trainer"]), getInvoiceByIdController);

export const InvoiceRoutes = router;

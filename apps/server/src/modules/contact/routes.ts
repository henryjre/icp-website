import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { sendInquiryMail } from "../../lib/mail.js";

export const contactRouter = Router();

const contactBodySchema = z.object({
  name: z.string().min(1).max(100),
  company: z.string().max(100).optional().default(""),
  email: z.string().email(),
  phone: z.string().max(30).optional().default(""),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

contactRouter.post(
  "/",
  validate({ body: contactBodySchema }),
  asyncHandler(async (req, res) => {
    await sendInquiryMail({
      name: req.body.name,
      company: req.body.company,
      email: req.body.email,
      phone: req.body.phone,
      subject: req.body.subject,
      message: req.body.message,
    });

    return res.status(204).send();
  }),
);

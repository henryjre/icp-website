import { Router } from "express";
import { authRouter } from "./modules/auth/routes.js";
import { usersRouter } from "./modules/users/routes.js";
import { projectsRouter } from "./modules/projects/routes.js";
import { elementsRouter } from "./modules/elements/routes.js";
import { shortLinksRouter, shortLookupRouter } from "./modules/elements/shortLinks.js";
import { documentsRouter, elementsDocumentsRouter, projectsDocumentsRouter } from "./modules/documents/routes.js";
import { elementsProgressRouter, progressRouter } from "./modules/progress/routes.js";
import { activityRouter } from "./modules/activity/routes.js";
import { invitesRouter } from "./modules/invites/routes.js";
import { contactRouter } from "./modules/contact/routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/projects", elementsRouter);
apiRouter.use("/projects", projectsDocumentsRouter);
apiRouter.use("/elements", elementsDocumentsRouter);
apiRouter.use("/elements", elementsProgressRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/progress", progressRouter);
apiRouter.use("/invites", invitesRouter);
apiRouter.use("/contact", contactRouter);
apiRouter.use("/p", shortLinksRouter);
apiRouter.use("/e", shortLinksRouter);
apiRouter.use("/short", shortLookupRouter);
apiRouter.use("/", activityRouter);

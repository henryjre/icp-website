import "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD to run seed:admin");
  process.exit(1);
}

const adminEmail = email.toLowerCase();
const adminPassword = password;

async function main() {
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: "System Administrator",
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
      status: "Active",
      rejectedReason: null,
      isActive: true,
    },
    create: {
      fullName: "System Administrator",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
      status: "Active",
      rejectedReason: null,
      isActive: true,
    },
  });

  console.log(`Admin user ready: ${user.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

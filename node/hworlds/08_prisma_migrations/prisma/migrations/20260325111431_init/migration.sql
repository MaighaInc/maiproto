-- CreateEnum
CREATE TYPE "CellType" AS ENUM ('STATIC', 'FORMULA', 'CONSTANT');

-- CreateEnum
CREATE TYPE "WorksheetType" AS ENUM ('REGULAR');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_ADMIN', 'FIRM_MANAGER', 'CLIENT_USER');

-- CreateTable
CREATE TABLE "Worksheet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorksheetType" NOT NULL DEFAULT 'REGULAR',
    "firmId" TEXT,
    "clientId" TEXT,
    "fileId" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "hasNonZeroValue" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "Worksheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorksheetColumn" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorksheetColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorksheetRow" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "isHeader" BOOLEAN NOT NULL DEFAULT false,
    "dataType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorksheetRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorksheetCell" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "CellType" NOT NULL DEFAULT 'STATIC',
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "dataType" TEXT,
    "isHeader" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorksheetCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FIRM_MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "metadata" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CPAFirm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "metadata" JSONB,

    CONSTRAINT "CPAFirm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFirm" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FIRM_MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "UserFirm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxFile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "scenario" TEXT,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "metadata" JSONB,

    CONSTRAINT "TaxFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Worksheet_firmId_idx" ON "Worksheet"("firmId");

-- CreateIndex
CREATE INDEX "Worksheet_clientId_idx" ON "Worksheet"("clientId");

-- CreateIndex
CREATE INDEX "Worksheet_fileId_idx" ON "Worksheet"("fileId");

-- CreateIndex
CREATE INDEX "Worksheet_deletedAt_idx" ON "Worksheet"("deletedAt");

-- CreateIndex
CREATE INDEX "Worksheet_createdById_idx" ON "Worksheet"("createdById");

-- CreateIndex
CREATE INDEX "Worksheet_templateId_idx" ON "Worksheet"("templateId");

-- CreateIndex
CREATE INDEX "Worksheet_isTemplate_idx" ON "Worksheet"("isTemplate");

-- CreateIndex
CREATE UNIQUE INDEX "WorksheetColumn_worksheetId_key_key" ON "WorksheetColumn"("worksheetId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "WorksheetColumn_worksheetId_order_key" ON "WorksheetColumn"("worksheetId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WorksheetRow_worksheetId_order_key" ON "WorksheetRow"("worksheetId", "order");

-- CreateIndex
CREATE INDEX "WorksheetCell_worksheetId_idx" ON "WorksheetCell"("worksheetId");

-- CreateIndex
CREATE UNIQUE INDEX "WorksheetCell_rowId_columnId_key" ON "WorksheetCell"("rowId", "columnId");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE INDEX "User_firebaseUid_idx" ON "User"("firebaseUid");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "CPAFirm_deletedAt_idx" ON "CPAFirm"("deletedAt");

-- CreateIndex
CREATE INDEX "CPAFirm_name_idx" ON "CPAFirm"("name");

-- CreateIndex
CREATE INDEX "UserFirm_userId_idx" ON "UserFirm"("userId");

-- CreateIndex
CREATE INDEX "UserFirm_firmId_idx" ON "UserFirm"("firmId");

-- CreateIndex
CREATE INDEX "UserFirm_deletedAt_idx" ON "UserFirm"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserFirm_userId_firmId_key" ON "UserFirm"("userId", "firmId");

-- CreateIndex
CREATE INDEX "Client_firmId_idx" ON "Client"("firmId");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");

-- CreateIndex
CREATE INDEX "TaxFile_clientId_idx" ON "TaxFile"("clientId");

-- CreateIndex
CREATE INDEX "TaxFile_deletedAt_idx" ON "TaxFile"("deletedAt");

-- CreateIndex
CREATE INDEX "TaxFile_year_idx" ON "TaxFile"("year");

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "CPAFirm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "TaxFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Worksheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetColumn" ADD CONSTRAINT "WorksheetColumn_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "Worksheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetRow" ADD CONSTRAINT "WorksheetRow_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "Worksheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetCell" ADD CONSTRAINT "WorksheetCell_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "Worksheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetCell" ADD CONSTRAINT "WorksheetCell_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "WorksheetRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetCell" ADD CONSTRAINT "WorksheetCell_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "WorksheetColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFirm" ADD CONSTRAINT "UserFirm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFirm" ADD CONSTRAINT "UserFirm_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "CPAFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "CPAFirm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxFile" ADD CONSTRAINT "TaxFile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

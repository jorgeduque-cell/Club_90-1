-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountTier" AS ENUM ('GUEST', 'PREMIUM');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('OPEN', 'CLOSED', 'FINISHED');

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('HOME_WIN', 'DRAW', 'AWAY_WIN', 'PENDING');

-- CreateEnum
CREATE TYPE "PredictionOutcome" AS ENUM ('HOME_WIN', 'DRAW', 'AWAY_WIN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'HIT', 'MISSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PREMIUM_PASS', 'LIFESAVER_TOPUP', 'REWARD_REDEMPTION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'CLAIMED');

-- CreateTable
CREATE TABLE "real_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "real_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "realTeamId" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "real_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clCoins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "accountTier" "AccountTier" NOT NULL DEFAULT 'GUEST',
    "isBankrupt" BOOLEAN NOT NULL DEFAULT false,
    "realTeamId" TEXT,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "storedLifeSavers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCOP" DOUBLE PRECISION NOT NULL,
    "coinsAdded" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "referenceId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_markets" (
    "id" TEXT NOT NULL,
    "realTeamHomeId" TEXT NOT NULL,
    "realTeamAwayId" TEXT NOT NULL,
    "multiplierHome" DOUBLE PRECISION NOT NULL,
    "multiplierDraw" DOUBLE PRECISION NOT NULL,
    "multiplierAway" DOUBLE PRECISION NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'OPEN',
    "result" "MatchResult" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "potentialReturn" DOUBLE PRECISION NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_items" (
    "id" TEXT NOT NULL,
    "predictionTicketId" TEXT NOT NULL,
    "matchMarketId" TEXT NOT NULL,
    "selectedOutcome" "PredictionOutcome" NOT NULL,
    "lockedMultiplier" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ticket_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costInCoins" DOUBLE PRECISION NOT NULL,
    "sponsorName" TEXT,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeItemId" TEXT NOT NULL,
    "qrCodeString" TEXT NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemption_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "real_players_realTeamId_idx" ON "real_players"("realTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_referenceId_key" ON "transactions"("referenceId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_userId_type_idx" ON "transactions"("userId", "type");

-- CreateIndex
CREATE INDEX "prediction_tickets_userId_idx" ON "prediction_tickets"("userId");

-- CreateIndex
CREATE INDEX "prediction_tickets_userId_status_idx" ON "prediction_tickets"("userId", "status");

-- CreateIndex
CREATE INDEX "ticket_items_predictionTicketId_idx" ON "ticket_items"("predictionTicketId");

-- CreateIndex
CREATE INDEX "ticket_items_matchMarketId_idx" ON "ticket_items"("matchMarketId");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_tickets_qrCodeString_key" ON "redemption_tickets"("qrCodeString");

-- CreateIndex
CREATE INDEX "redemption_tickets_userId_idx" ON "redemption_tickets"("userId");

-- CreateIndex
CREATE INDEX "redemption_tickets_storeItemId_idx" ON "redemption_tickets"("storeItemId");

-- AddForeignKey
ALTER TABLE "real_players" ADD CONSTRAINT "real_players_realTeamId_fkey" FOREIGN KEY ("realTeamId") REFERENCES "real_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_realTeamId_fkey" FOREIGN KEY ("realTeamId") REFERENCES "real_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_markets" ADD CONSTRAINT "match_markets_realTeamHomeId_fkey" FOREIGN KEY ("realTeamHomeId") REFERENCES "real_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_markets" ADD CONSTRAINT "match_markets_realTeamAwayId_fkey" FOREIGN KEY ("realTeamAwayId") REFERENCES "real_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_tickets" ADD CONSTRAINT "prediction_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_items" ADD CONSTRAINT "ticket_items_predictionTicketId_fkey" FOREIGN KEY ("predictionTicketId") REFERENCES "prediction_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_items" ADD CONSTRAINT "ticket_items_matchMarketId_fkey" FOREIGN KEY ("matchMarketId") REFERENCES "match_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_tickets" ADD CONSTRAINT "redemption_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_tickets" ADD CONSTRAINT "redemption_tickets_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "store_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;


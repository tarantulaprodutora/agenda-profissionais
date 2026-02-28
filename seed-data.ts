import { getDb, createProfessional, createActivityType, createRequester } from "./server/db";

const PROFESSIONALS = [
  { name: "PAN", columnOrder: 1, color: "#FFD700", groupLabel: "principal" },
  { name: "BTG", columnOrder: 2, color: "#FF6B6B", groupLabel: "principal" },
  { name: "TARANTULA", columnOrder: 3, color: "#4ECDC4", groupLabel: "principal" },
  { name: "PROF 4", columnOrder: 4, color: "#95E1D3", groupLabel: "principal" },
  { name: "PROF 5", columnOrder: 5, color: "#F38181", groupLabel: "principal" },
  { name: "PROF 6", columnOrder: 6, color: "#AA96DA", groupLabel: "principal" },
  { name: "PROF 7", columnOrder: 7, color: "#FCBAD3", groupLabel: "principal" },
  { name: "PROF 8", columnOrder: 8, color: "#A8D8EA", groupLabel: "principal" },
  { name: "PROF 9", columnOrder: 9, color: "#AA96DA", groupLabel: "principal" },
  { name: "PROF 10", columnOrder: 10, color: "#FCE38A", groupLabel: "principal" },
  { name: "PROF 11", columnOrder: 11, color: "#EAFFD0", groupLabel: "principal" },
  { name: "PROF 12", columnOrder: 12, color: "#FCE38A", groupLabel: "secundario" },
  { name: "PROF 13", columnOrder: 13, color: "#DDA0DD", groupLabel: "secundario" },
];

const ACTIVITY_TYPES = [
  { name: "Desenvolvimento", color: "#3B82F6" },
  { name: "Reunião", color: "#8B5CF6" },
  { name: "Suporte", color: "#EC4899" },
  { name: "Documentação", color: "#F59E0B" },
  { name: "Teste", color: "#10B981" },
];

const REQUESTERS = [
  { name: "Bruno" },
  { name: "Anna" },
  { name: "Gabi" },
  { name: "Lucas" },
  { name: "Mirian" },
  { name: "Allan" },
  { name: "Phill" },
];

async function seed() {
  try {
    console.log("🌱 Starting database seed...");
    const db = await getDb();
    
    if (!db) {
      console.error("❌ Database not available");
      process.exit(1);
    }

    console.log("📝 Creating professionals...");
    for (const prof of PROFESSIONALS) {
      await createProfessional(prof);
    }

    console.log("📝 Creating activity types...");
    for (const type of ACTIVITY_TYPES) {
      await createActivityType(type);
    }

    console.log("📝 Creating requesters...");
    for (const requester of REQUESTERS) {
      await createRequester(requester);
    }

    console.log("✅ Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();

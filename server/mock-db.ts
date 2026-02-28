// Mock in-memory database for development when DATABASE_URL is not configured
import { InsertActivityBlock, InsertProfessional, InsertRequester, InsertActivityType } from "../drizzle/schema";

interface MockDatabase {
  professionals: (InsertProfessional & { id: number })[];
  activityTypes: (InsertActivityType & { id: number })[];
  requesters: (InsertRequester & { id: number })[];
  activityBlocks: (InsertActivityBlock & { id: number })[];
}

let mockDb: MockDatabase = {
  professionals: [],
  activityTypes: [],
  requesters: [],
  activityBlocks: [], // Começar vazio
};

let nextProfessionalId = 1;
let nextActivityTypeId = 1;
let nextRequesterId = 1;
let nextBlockId = 1;

export function initMockDatabase() {
  // Initialize with default data
  const defaultProfessionals = [
    { name: "Ana Silva", columnOrder: 1, color: "#00D9FF", active: true, groupLabel: "principal" },
    { name: "Bruno Costa", columnOrder: 2, color: "#7C3AED", active: true, groupLabel: "principal" },
    { name: "Carla Mendes", columnOrder: 3, color: "#0EA5E9", active: true, groupLabel: "principal" },
    { name: "Diego Rocha", columnOrder: 4, color: "#06B6D4", active: true, groupLabel: "principal" },
    { name: "Elena Ferreira", columnOrder: 5, color: "#A855F7", active: true, groupLabel: "principal" },
    { name: "Felipe Santos", columnOrder: 6, color: "#EC4899", active: true, groupLabel: "principal" },
    { name: "Gabriela Lima", columnOrder: 7, color: "#001F3F", active: true, groupLabel: "principal" },
    { name: "Henrique Oliveira", columnOrder: 8, color: "#0369A1", active: true, groupLabel: "principal" },
    { name: "Isabela Martins", columnOrder: 9, color: "#6366F1", active: true, groupLabel: "principal" },
    { name: "João Pereira", columnOrder: 10, color: "#14B8A6", active: true, groupLabel: "principal" },
    { name: "Karen Souza", columnOrder: 11, color: "#D946EF", active: true, groupLabel: "principal" },
    { name: "Lucas Alves", columnOrder: 12, color: "#0891B2", active: true, groupLabel: "secundario" },
    { name: "Mariana Nunes", columnOrder: 13, color: "#8B5CF6", active: true, groupLabel: "secundario" },
  ];

  const defaultActivityTypes = [
    { name: "Animação", color: "#00D9FF" },
    { name: "Edição", color: "#7C3AED" },
    { name: "Sonorização", color: "#0EA5E9" },
    { name: "Locução", color: "#06B6D4" },
    { name: "Tratamento de Imagens", color: "#A855F7" },
    { name: "Design", color: "#EC4899" },
    { name: "Reunião", color: "#001F3F" },
    { name: "Backup", color: "#0369A1" },
    { name: "Pesquisa", color: "#6366F1" },
    { name: "Presencial", color: "#14B8A6" },
    { name: "Almoço", color: "#D946EF" },
  ];

  const defaultRequesters = [
    { name: "Bruno", active: true },
    { name: "Anna", active: true },
    { name: "Gabi", active: true },
    { name: "Lucas", active: true },
    { name: "Mirian", active: true },
    { name: "Allan", active: true },
    { name: "Phill", active: true },
  ];

  // Add default professionals
  for (const prof of defaultProfessionals) {
    mockDb.professionals.push({ ...prof, id: nextProfessionalId++ });
  }

  // Add default activity types
  for (const type of defaultActivityTypes) {
    mockDb.activityTypes.push({ ...type, id: nextActivityTypeId++ });
  }

  // Add default requesters
  for (const requester of defaultRequesters) {
    mockDb.requesters.push({ ...requester, id: nextRequesterId++ });
  }
}

export function getMockDatabase() {
  return mockDb;
}

export function addProfessional(data: InsertProfessional) {
  const prof = { ...data, id: nextProfessionalId++ };
  mockDb.professionals.push(prof);
  return prof;
}

export function getProfessionals() {
  return mockDb.professionals.filter(p => p.active !== false);
}

export function getProfessionalById(id: number) {
  return mockDb.professionals.find(p => p.id === id);
}

export function updateProfessional(id: number, data: Partial<InsertProfessional>) {
  const prof = mockDb.professionals.find(p => p.id === id);
  if (prof) {
    Object.assign(prof, data);
  }
  return prof;
}

export function deleteProfessional(id: number) {
  const prof = mockDb.professionals.find(p => p.id === id);
  if (prof) {
    prof.active = false;
  }
}

export function getActivityTypes() {
  return mockDb.activityTypes;
}

export function addActivityType(data: InsertActivityType) {
  const type = { ...data, id: nextActivityTypeId++ };
  mockDb.activityTypes.push(type);
  return type;
}

export function getRequesters() {
  return mockDb.requesters.filter(r => r.active !== false);
}

export function addRequester(data: InsertRequester) {
  const requester = { ...data, id: nextRequesterId++ };
  mockDb.requesters.push(requester);
  return requester;
}

export function deleteRequester(id: number) {
  const requester = mockDb.requesters.find(r => r.id === id);
  if (requester) {
    requester.active = false;
  }
}

export function getBlocksByDate(date: string) {
  return mockDb.activityBlocks.filter(b => b.date === date).sort((a, b) => a.startTime!.localeCompare(b.startTime!));
}

export function addBlock(data: InsertActivityBlock) {
  const block = { ...data, id: nextBlockId++ };
  mockDb.activityBlocks.push(block);
  return block;
}

export function updateBlock(id: number, data: Partial<InsertActivityBlock>) {
  const block = mockDb.activityBlocks.find(b => b.id === id);
  if (block) {
    Object.assign(block, data);
  }
  return block;
}

export function deleteBlock(id: number) {
  const index = mockDb.activityBlocks.findIndex(b => b.id === id);
  if (index !== -1) {
    mockDb.activityBlocks.splice(index, 1);
  }
}

export function getMonthlyReport(year: number, month: number, professionalId?: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return mockDb.activityBlocks.filter(block => {
    const inRange = block.date! >= startDate && block.date! <= endDate;
    const matchesProfessional = !professionalId || block.professionalId === professionalId;
    return inRange && matchesProfessional;
  });
}


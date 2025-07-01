import { PrismaClient } from "@prisma/client";
import { v7 } from "uuid";

export const prisma = new PrismaClient();

export const uuid = () => v7();

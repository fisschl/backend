import { expect, test } from "bun:test";
import { signIn, signUp } from ".";
import { prisma } from "../../utils/db";

test("signUp", async () => {
  const user = await signUp({
    userName: "signUp",
    password: "signUp",
    email: "signUp@test.com",
  });
  expect(user).toBeDefined();
  await prisma.user.delete({
    where: {
      userId: user.userId,
    },
  });
});

test("signIn", async () => {
  const user = await signUp({
    userName: "signIn",
    password: "signIn",
    email: "signIn@test.com",
  });
  const result = await signIn({
    loginName: "signIn",
    password: "signIn",
  });
  expect(result).toBeDefined();
  expect(result.userId).toBe(user.userId);
  await prisma.user.delete({
    where: {
      userId: user.userId,
    },
  });
});

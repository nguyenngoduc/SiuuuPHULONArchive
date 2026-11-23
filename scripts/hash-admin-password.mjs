import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashAdminPassword } from "../lib/admin-password.mjs";

if (!process.stdin.isTTY) {
  console.error("Chạy lệnh trong Terminal hoặc PowerShell để nhập mật khẩu ẩn.");
  process.exit(1);
}

const hiddenOutput = new Writable({ write(_data, _encoding, callback) { callback(); } });
const input = createInterface({ input: process.stdin, output: hiddenOutput, terminal: true, historySize: 0 });
input.on("SIGINT", () => input.close());

try {
  process.stderr.write("Mật khẩu mới (không hiển thị): ");
  const password = await input.question("");
  process.stderr.write("\nNhập lại mật khẩu: ");
  const confirmation = await input.question("");
  process.stderr.write("\n");
  if (password !== confirmation) throw new Error("Hai mật khẩu không khớp.");
  console.log(await hashAdminPassword(password));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  input.close();
}

import { defaultHandler } from "@kalo/lib/server/defaultHandler";

export default defaultHandler({
  GET: import("./_getAdd"),
});

import { registerEvent } from "../register-event";
import { MangoApi } from "@main/services";

interface MangoApiCallPayload {
  method: "get" | "post" | "put" | "patch" | "delete";
  url: string;
  data?: unknown;
  params?: unknown;
  options?: {
    ifModifiedSince?: Date;
  };
}

const mangoApiCall = async (
  _event: Electron.IpcMainInvokeEvent,
  payload: MangoApiCallPayload
) => {
  const { method, url, data, params, options } = payload;

  const getErrorMessage = (error: unknown): string | null => {
    if (typeof error === "object" && error !== null) {
      const response = (
        error as { response?: { data?: { message?: unknown } } }
      ).response;
      const responseMessage = response?.data?.message;

      if (typeof responseMessage === "string") {
        return responseMessage;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return null;
  };

  try {
    let request: Promise<unknown>;

    switch (method) {
      case "get":
        request = MangoApi.get(url, params, options);
        break;
      case "post":
        request = MangoApi.post(url, data, options);
        break;
      case "put":
        request = MangoApi.put(url, data, options);
        break;
      case "patch":
        request = MangoApi.patch(url, data, options);
        break;
      case "delete":
        request = MangoApi.delete(url, options);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return await request;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage ?? "mango-api-call-failed");
  }
};

registerEvent("mangoApiCall", mangoApiCall);

import axios, { AxiosInstance } from "axios";
import { networkLogger as logger } from "./logger";
import { omit } from "lodash-es";
import { appVersion } from "@main/constants";

const DEFAULT_API_URL = "https://hydra-api-us-east-1.losbroxas.org";

export interface MangoApiOptions {
  ifModifiedSince?: Date;
  ifNoneMatch?: string;
  validateStatus?: (status: number) => boolean;
  /** Whether the request requires an authenticated session. */
  needsAuth?: boolean;
  /** Whether the request requires an active subscription. */
  needsSubscription?: boolean;
}

export class MangoApi {
  private static instance: AxiosInstance;

  private static readonly ADD_LOG_INTERCEPTOR = true;

  static async setupApi() {
    this.instance = axios.create({
      // Local builds do not receive CI's MAIN_VITE_API_URL. Keep using an
      // explicitly configured Mango endpoint when present, otherwise use the
      // public catalogue API compiled into the original Hydra release.
      baseURL: import.meta.env.MAIN_VITE_API_URL || DEFAULT_API_URL,
      headers: { "User-Agent": `Mango Launcher v${appVersion}` },
    });

    if (this.ADD_LOG_INTERCEPTOR) {
      this.instance.interceptors.request.use(
        (request) => {
          logger.log(" ---- REQUEST ----");
          const data = Array.isArray(request.data)
            ? request.data
            : omit(request.data, ["refreshToken"]);
          logger.log(request.method, request.url, request.params, data);
          return request;
        },
        (error) => {
          logger.error("request error", error);
          return Promise.reject(error);
        }
      );
      this.instance.interceptors.response.use(
        (response) => {
          logger.log(" ---- RESPONSE ----");
          const data = Array.isArray(response.data)
            ? response.data
            : omit(response.data, ["username", "accessToken", "refreshToken"]);
          logger.log(
            response.status,
            response.config.method,
            response.config.url,
            data
          );
          return response;
        },
        (error) => {
          logger.error(" ---- RESPONSE ERROR ----");
          const { config } = error;

          const data = JSON.parse(config.data ?? null);

          logger.error(
            config.method,
            config.baseURL,
            config.url,
            omit(config.headers, [
              "accessToken",
              "refreshToken",
              "Authorization",
            ]),
            Array.isArray(data)
              ? data
              : omit(data, ["accessToken", "refreshToken"])
          );
          if (error.response) {
            logger.error(
              "Response error:",
              error.response.status,
              error.response.data
            );

            return Promise.reject(error as Error);
          }

          if (error.request) {
            const errorData = error.toJSON();
            logger.error("Request error:", errorData.code, errorData.message);
            return Promise.reject(
              new Error(
                `Request failed with ${errorData.code} ${errorData.message}`
              )
            );
          }

          logger.error("Error", error.message);
          return Promise.reject(error as Error);
        }
      );
    }
  }

  private static getAxiosConfig() {
    return {};
  }

  static async get<T = any>(
    url: string,
    params?: any,
    options?: MangoApiOptions
  ) {
    const headers = {
      "X-If-Modified-Since": options?.ifModifiedSince?.toUTCString(),
      "If-None-Match": options?.ifNoneMatch,
    };

    return this.instance
      .get<T>(url, {
        params,
        ...this.getAxiosConfig(),
        headers,
        validateStatus: options?.validateStatus,
      })
      .then((response) => response.data);
  }

  static async getResponse<T = any>(
    url: string,
    params?: any,
    options?: MangoApiOptions
  ) {
    const headers = {
      "X-If-Modified-Since": options?.ifModifiedSince?.toUTCString(),
      "If-None-Match": options?.ifNoneMatch,
    };

    return this.instance
      .get<T>(url, {
        params,
        ...this.getAxiosConfig(),
        headers,
        validateStatus: options?.validateStatus,
      })
      .then((response) => ({
        status: response.status,
        data: response.data,
        headers: response.headers,
      }));
  }

  static async post<T = any>(
    url: string,
    data?: any,
    _options?: MangoApiOptions
  ) {
    return this.instance
      .post<T>(url, data, this.getAxiosConfig())
      .then((response) => response.data);
  }

  static async put<T = any>(
    url: string,
    data?: any,
    _options?: MangoApiOptions
  ) {
    return this.instance
      .put<T>(url, data, this.getAxiosConfig())
      .then((response) => response.data);
  }

  static async patch<T = any>(
    url: string,
    data?: any,
    _options?: MangoApiOptions
  ) {
    return this.instance
      .patch<T>(url, data, this.getAxiosConfig())
      .then((response) => response.data);
  }

  static async delete<T = any>(url: string, _options?: MangoApiOptions) {
    return this.instance
      .delete<T>(url, this.getAxiosConfig())
      .then((response) => response.data);
  }

  // Auth state is managed externally (tokens persisted in LevelDB). These
  // accessors let call sites gate network calls without importing the full
  // auth machinery, which was removed during the fork rebrand. They currently
  // report false so subscription/auth-gated features degrade to no-ops.
  static isLoggedIn(): boolean {
    return false;
  }

  static hasActiveSubscription(): boolean {
    return false;
  }

  static async checkDownloadSourcesChanges(
    downloadSourceIds: string[],
    games: Array<{ shop: string; objectId: string }>,
    since: string
  ) {
    logger.info("MangoApi.checkDownloadSourcesChanges called with:", {
      downloadSourceIds,
      gamesCount: games.length,
      since,
    });

    try {
      const result = await this.post<
        Array<{
          shop: string;
          objectId: string;
          newDownloadOptionsCount: number;
          downloadSourceIds: string[];
        }>
      >("/download-sources/changes", {
        downloadSourceIds,
        games,
        since,
      });

      logger.info(
        "MangoApi.checkDownloadSourcesChanges completed successfully:",
        result
      );
      return result;
    } catch (error) {
      logger.error("MangoApi.checkDownloadSourcesChanges failed:", error);
      throw error;
    }
  }
}

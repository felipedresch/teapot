/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abacatepayWebhook from "../abacatepayWebhook.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as productSuggestions from "../productSuggestions.js";
import type * as lib_shopeeAffiliateApi from "../lib/shopeeAffiliateApi.js";
import type * as lib_suggestionIdeas from "../lib/suggestionIdeas.js";
import type * as lib_suggestionRanking from "../lib/suggestionRanking.js";
import type * as config from "../config.js";
import type * as dev_previewSeed from "../dev/previewSeed.js";
import type * as eventConfig from "../eventConfig.js";
import type * as eventInvites from "../eventInvites.js";
import type * as events from "../events.js";
import type * as giftLinks from "../giftLinks.js";
import type * as gifts from "../gifts.js";
import type * as http from "../http.js";
import type * as lib_deployment from "../lib/deployment.js";
import type * as lib_giftLinkValidators from "../lib/giftLinkValidators.js";
import type * as payments from "../payments.js";
import type * as todos from "../todos.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abacatepayWebhook: typeof abacatepayWebhook;
  analytics: typeof analytics;
  auth: typeof auth;
  crons: typeof crons;
  productSuggestions: typeof productSuggestions;
  "lib/shopeeAffiliateApi": typeof lib_shopeeAffiliateApi;
  "lib/suggestionIdeas": typeof lib_suggestionIdeas;
  "lib/suggestionRanking": typeof lib_suggestionRanking;
  config: typeof config;
  "dev/previewSeed": typeof dev_previewSeed;
  eventConfig: typeof eventConfig;
  eventInvites: typeof eventInvites;
  events: typeof events;
  giftLinks: typeof giftLinks;
  gifts: typeof gifts;
  http: typeof http;
  "lib/deployment": typeof lib_deployment;
  "lib/giftLinkValidators": typeof lib_giftLinkValidators;
  payments: typeof payments;
  todos: typeof todos;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

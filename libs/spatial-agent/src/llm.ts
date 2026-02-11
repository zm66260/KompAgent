/**
 * LLM Provider Configuration
 *
 * Supports multiple LLM providers:
 * - Anthropic Claude
 * - OpenAI
 * - GitHub Models (via OpenAI-compatible API)
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * LLM Provider types
 */
export type LLMProvider = "anthropic" | "openai" | "github";

/**
 * LLM Configuration options
 */
export interface LLMConfig {
  /** LLM provider to use */
  provider: LLMProvider;
  /** API key for the provider */
  apiKey: string;
  /** Model name (provider-specific) */
  model?: string;
  /** Base URL for API (for GitHub Models or custom endpoints) */
  baseUrl?: string;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Default models for each provider
 */
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  github: "gpt-4o",
};

/**
 * GitHub Models available models
 */
export const GITHUB_MODELS = {
  // OpenAI models
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "o1-preview": "o1-preview",
  "o1-mini": "o1-mini",
  // Anthropic models (via GitHub)
  "claude-3.5-sonnet": "claude-3.5-sonnet",
  // Meta models
  "llama-3.2-90b": "Llama-3.2-90B-Vision-Instruct",
  // Mistral models
  "mistral-large": "Mistral-large-2411",
} as const;

/**
 * Create an LLM instance based on configuration
 *
 * @param config LLM configuration
 * @returns BaseChatModel instance
 *
 * @example
 * ```typescript
 * // Using Anthropic
 * const llm = createLLM({
 *   provider: "anthropic",
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 * });
 *
 * // Using GitHub Models
 * const llm = createLLM({
 *   provider: "github",
 *   apiKey: process.env.GITHUB_TOKEN!,
 *   model: "gpt-4o",
 *   baseUrl: "https://models.inference.ai.azure.com",
 * });
 * ```
 */
export function createLLM(config: LLMConfig): BaseChatModel {
  const { provider, apiKey, model, baseUrl, temperature = 0.7, maxTokens } = config;

  const modelName = model || DEFAULT_MODELS[provider];

  switch (provider) {
    case "anthropic":
      return new ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName,
        temperature,
        maxTokens,
      });

    case "openai":
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName,
        temperature,
        maxTokens,
      });

    case "github":
      // GitHub Models uses OpenAI-compatible API
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName,
        temperature,
        maxTokens,
        configuration: {
          baseURL: baseUrl || "https://models.inference.ai.azure.com",
        },
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Detect available LLM provider from environment variables
 *
 * Priority: Anthropic > OpenAI > GitHub
 */
export function detectLLMProvider(): LLMConfig | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
    };
  }

  if (process.env.GITHUB_TOKEN) {
    return {
      provider: "github",
      apiKey: process.env.GITHUB_TOKEN,
      baseUrl: process.env.GITHUB_MODELS_ENDPOINT || "https://models.inference.ai.azure.com",
      model: process.env.GITHUB_MODELS_MODEL || "gpt-4o",
    };
  }

  return null;
}

/**
 * Get model string for deepagents createDeepAgent
 *
 * For GitHub Models, returns OpenAI-compatible configuration
 */
export function getModelString(config: LLMConfig): string {
  switch (config.provider) {
    case "anthropic":
      return config.model || DEFAULT_MODELS.anthropic;
    case "openai":
      return config.model || DEFAULT_MODELS.openai;
    case "github":
      // For GitHub Models, we need to use the LLM instance directly
      // Return a placeholder that will be replaced by createLLM()
      return config.model || DEFAULT_MODELS.github;
    default:
      return DEFAULT_MODELS.openai;
  }
}

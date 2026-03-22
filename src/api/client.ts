import { ClaudeRequest, ClaudeResponse, Message, Tool, ContentBlock, ToolUse, ToolExecutionResult } from '../types/index.js';

export class ClaudeAPIClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514', baseURL: string = 'https://api.anthropic.com') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL;
  }

  async sendMessage(
    messages: Message[],
    tools: Tool[],
    options: { stream?: boolean; system?: string } = {}
  ): Promise<ClaudeResponse> {
    const { stream = false, system } = options;

    const request: ClaudeRequest = {
      model: this.model,
      messages,
      tools,
      max_tokens: 4096,
      stream,
      ...(system && { system }),
    };

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async sendMessageWithTools(
    messages: Message[],
    tools: Tool[],
    onToolUse: (toolUse: ToolUse) => Promise<ToolExecutionResult>,
    system?: string
  ): Promise<string> {
    let currentMessages = [...messages];
    let response = await this.sendMessage(currentMessages, tools, { system });

    while (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((c): c is ToolUse => c.type === 'tool_use');

      for (const toolUse of toolUses) {
        const result = await onToolUse(toolUse);

        currentMessages.push({
          role: 'assistant',
          content: response.content,
        });

        currentMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result.content,
              is_error: result.is_error,
            },
          ],
        });
      }

      response = await this.sendMessage(currentMessages, tools, { system });
    }

    const textContent = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    return textContent;
  }
}
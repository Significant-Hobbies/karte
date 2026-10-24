import {
  createStreamParserState,
  feedChunk,
  finishStream,
} from './ai-components/stream-parser';
import type {
  LayoutDirectives,
  RenderableComponent,
} from './ai-components/types';

export type ChatDelivery = {
  text: string;
  components: RenderableComponent[];
  layout: LayoutDirectives | null;
};

export function getChatDeliveryOutcome(text: string) {
  return text.trim() ? 'delivered' : 'empty_response';
}

export async function readChatDelivery(
  response: Response,
  onText: (text: string) => void,
): Promise<ChatDelivery> {
  if (!response.body) {
    throw new Error('Chat response has no stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createStreamParserState();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const flushed = feedChunk(parser, chunk);
    if (flushed) onText(flushed);
  }

  const { flushedText, components, layout } = finishStream(parser);
  if (flushedText) onText(flushedText);
  return {
    text: parser.text,
    components,
    layout,
  };
}

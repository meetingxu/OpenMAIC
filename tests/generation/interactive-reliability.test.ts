import { describe, expect, it, vi } from 'vitest';
import { findInteractiveContentFailure } from '../../packages/@openmaic/generation/src/interactive-script-validator';
import { generateWidgetContent } from '../../packages/@openmaic/generation/src/scene-generator';
import type { SceneOutline } from '@openmaic/generation';

const outline: SceneOutline = {
  id: 'diagram',
  type: 'interactive',
  title: '角色关系',
  description: '点击查看角色职责',
  keyPoints: [],
  order: 0,
  widgetType: 'diagram',
  widgetOutline: { concept: '角色' },
};
const good =
  '<html><body><button type="button" onclick="this.textContent=\'已选择\'">选择</button></body></html>';

describe('interactive reliability', () => {
  it('rejects malformed config and event attributes before the page reaches users', () => {
    expect(
      findInteractiveContentFailure(
        '<script type="application/json" id="widget-config">{"nodes":[],}</script>',
      )?.kind,
    ).toBe('widget-config');
    expect(findInteractiveContentFailure('<button onclick="const x = ;">选择</button>')?.kind).toBe(
      'event-handler',
    );
    expect(
      findInteractiveContentFailure('<button onclick="return false">选择</button>'),
    ).toBeNull();
    expect(
      findInteractiveContentFailure('<textarea><button onclick="const x = ;"></textarea>'),
    ).toBeNull();
    expect(
      findInteractiveContentFailure('<template><button onclick="const x = ;"></button></template>'),
    ).toBeNull();
  });
  it('repairs a bad widget once with the exact diagnostic and accepts the corrected document', async () => {
    const aiCall = vi
      .fn()
      .mockResolvedValueOnce(
        '<html><body><script id="widget-config" type="application/json">{"nodes":[],}</script></body></html>',
      )
      .mockResolvedValueOnce(good);
    const onFailure = vi.fn();
    const content = await generateWidgetContent(outline, aiCall, undefined, { onFailure });
    expect(content?.html).toContain('已选择');
    expect(aiCall).toHaveBeenCalledTimes(2);
    expect(aiCall.mock.calls[1]?.[1]).toContain('widget-config is not valid JSON');
    expect(aiCall.mock.calls[0]?.[0]).toContain('opaque origin');
    expect(onFailure).not.toHaveBeenCalled();
  });
  it('stops after one unsuccessful repair and returns a retryable failure', async () => {
    const aiCall = vi
      .fn()
      .mockResolvedValue('<html><body><button onclick="const x = ;">选择</button></body></html>');
    const onFailure = vi.fn();
    expect(await generateWidgetContent(outline, aiCall, undefined, { onFailure })).toBeNull();
    expect(aiCall).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenCalledWith({ code: 'invalid-model-output' });
  });
});

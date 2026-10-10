import type { SceneOutline } from '@/lib/types/generation';
import type { WidgetType } from '@/lib/types/widgets';

const WIDGET_TYPES = new Set<string>([
  'simulation',
  'diagram',
  'code',
  'game',
  'visualization3d',
  'procedural-skill',
]);

/** Models sometimes put the widget subtype in `type`; repair both new and saved outlines. */
export function normalizeSceneOutline(outline: SceneOutline): SceneOutline {
  const type: string = outline.type;
  if (!WIDGET_TYPES.has(type)) return outline;
  return {
    ...outline,
    type: 'interactive',
    widgetType: type as WidgetType,
    widgetOutline: outline.widgetOutline ?? { concept: outline.title },
  };
}

// Proíbe cor e medida literais fora dos design tokens (REQ-FND-061): use packages/design-tokens.
const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const PX = /^-?\d+(?:\.\d+)?px$/;
const RGB = /^(rgb|rgba|hsl|hsla)\(/i;

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Proíbe valores de design literais; use os design tokens' },
    messages: { useToken: 'Valor de design literal "{{value}}": use um token de packages/design-tokens.' },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (/packages\/design-tokens\//.test(filename)) return {};
    function check(node, value) {
      if (typeof value !== 'string') return;
      const v = value.trim();
      if (HEX.test(v) || PX.test(v) || RGB.test(v)) {
        context.report({ node, messageId: 'useToken', data: { value: v } });
      }
    }
    return {
      Literal(node) { check(node, node.value); },
      TemplateElement(node) { if (node.parent?.expressions?.length === 0) check(node, node.value?.cooked); },
    };
  },
};

// Clientes (webs e apps) não chamam a API à mão: usam o SDK gerado dos contratos (REQ-FND-070).
const NAMES = new Set(['fetch', 'axios', 'XMLHttpRequest']);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Proíbe fetch/axios/XMLHttpRequest e URL de API montada à mão no código de cliente' },
    messages: {
      useSdk: 'Chamada de rede direta ({{name}}): use o SDK gerado (@koovela/sdk).',
      rawApiUrl: 'URL de API montada à mão: use o SDK gerado (@koovela/sdk).',
    },
    schema: [],
  },
  create(context) {
    const report = (node, name) => context.report({ node, messageId: 'useSdk', data: { name } });
    const isApiUrl = (s) => typeof s === 'string' && /(^|\/\/)api\.[^/]*koovela|\/v\d+\//.test(s);
    return {
      CallExpression(node) {
        const c = node.callee;
        if (c.type === 'Identifier' && NAMES.has(c.name)) report(node, c.name);
        if (c.type === 'MemberExpression' && c.property.type === 'Identifier') {
          if (c.property.name === 'fetch') report(node, 'fetch');
          if (c.object.type === 'Identifier' && c.object.name === 'axios') report(node, 'axios');
        }
      },
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'XMLHttpRequest') report(node, 'XMLHttpRequest');
      },
      Literal(node) {
        if (isApiUrl(node.value)) context.report({ node, messageId: 'rawApiUrl' });
      },
      TemplateElement(node) {
        if (isApiUrl(node.value?.cooked)) context.report({ node, messageId: 'rawApiUrl' });
      },
    };
  },
};

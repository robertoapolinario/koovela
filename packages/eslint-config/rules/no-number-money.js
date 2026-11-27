// Proíbe `number` em campos de dinheiro (CONST III, REQ-FND-061): use o tipo `Money` (centavos bigint + moeda).
const MONEY_NAME = /(^|_)(cents|amount|price|money|fee|total)(_|$)|(Cents|Amount|Price|Money|Fee|Total)$/;

function nameOf(node) {
  if (!node) return undefined;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal') return String(node.value);
  return undefined;
}

function isNumberType(typeAnnotation) {
  const t = typeAnnotation?.typeAnnotation;
  if (!t) return false;
  if (t.type === 'TSNumberKeyword') return true;
  if (t.type === 'TSUnionType') return t.types.some((x) => x.type === 'TSNumberKeyword');
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Proíbe number em campos de dinheiro; use Money' },
    messages: { useMoney: 'Campo de dinheiro "{{name}}" não pode ser number: use o tipo Money (centavos em bigint).' },
    schema: [],
  },
  create(context) {
    function check(node, key) {
      const name = nameOf(key);
      if (name && MONEY_NAME.test(name) && isNumberType(node.typeAnnotation)) {
        context.report({ node, messageId: 'useMoney', data: { name } });
      }
    }
    return {
      TSPropertySignature(node) { check(node, node.key); },
      PropertyDefinition(node) { check(node, node.key); },
      Identifier(node) {
        if (node.typeAnnotation && node.parent?.type !== 'TSPropertySignature') check(node, node);
      },
    };
  },
};

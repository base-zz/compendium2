export class RuleEngine {
  constructor(rules) {
    this.rules = rules.sort((a, b) => b.priority - a.priority);
  }

  evaluate(state, env) {
    const activeRules = this.rules.filter(rule => rule.condition(state, env));
    
    // Deduplicate by action type, keeping highest priority
    const actions = new Map();
    activeRules.forEach(rule => {
      rule.actions.forEach(action => {
        if (!actions.has(action.type) || 
            rule.priority > actions.get(action.type).priority) {
          actions.set(action.type, { ...action, rulePriority: rule.priority });
        }
      });
    });

    return Array.from(actions.values());
  }
}
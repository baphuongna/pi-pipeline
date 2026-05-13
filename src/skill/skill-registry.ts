/**
 * Skill Registry - pi-pipeline
 * 
 * Manages reusable procedures and patterns as skills.
 */

export interface SkillDocument {
  id: string;
  name: string;
  description: string;
  body: string;
  version: number;
  created: number;
  updated: number;
  tags?: string[];
  triggerCount?: number;
}

export interface NewSkill {
  name: string;
  description: string;
  body: string;
  tags?: string[];
}

export interface SkillSearchResult {
  skill: SkillDocument;
  relevance: number;
  matchedOn: ('name' | 'description' | 'body' | 'tag')[];
}

/**
 * Creates skill registry
 */
export function createSkillRegistry() {
  const skills = new Map<string, SkillDocument>();
  const nameIndex = new Map<string, string>();
  const tagIndex = new Map<string, Set<string>>();
  
  function generateId(name: string): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${slug}-${Date.now().toString(36)}`;
  }
  
  function tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  }
  
  return {
    create(input: NewSkill): SkillDocument {
      const now = Date.now();
      const id = generateId(input.name);
      const skill: SkillDocument = {
        id, name: input.name, description: input.description, body: input.body,
        version: 1, created: now, updated: now, tags: input.tags || [], triggerCount: 0
      };
      skills.set(id, skill);
      nameIndex.set(input.name.toLowerCase(), id);
      for (const tag of skill.tags || []) {
        if (!tagIndex.has(tag)) tagIndex.set(tag, new Set());
        tagIndex.get(tag)!.add(id);
      }
      return skill;
    },
    
    get(id: string): SkillDocument | undefined { return skills.get(id); },
    getByName(name: string): SkillDocument | undefined {
      const id = nameIndex.get(name.toLowerCase());
      return id ? skills.get(id) : undefined;
    },
    
    update(id: string, updates: Partial<Omit<SkillDocument, 'id' | 'created'>>): SkillDocument | undefined {
      const skill = skills.get(id);
      if (!skill) return undefined;
      const updated: SkillDocument = { ...skill, ...updates, updated: Date.now(), version: skill.version + 1 };
      skills.set(id, updated);
      return updated;
    },
    
    delete(id: string): boolean {
      const skill = skills.get(id);
      if (!skill) return false;
      nameIndex.delete(skill.name.toLowerCase());
      for (const tag of skill.tags || []) tagIndex.get(tag)?.delete(id);
      return skills.delete(id);
    },
    
    list(options: { tag?: string; sortBy?: 'name' | 'updated' | 'triggerCount'; limit?: number } = {}): SkillDocument[] {
      let result = Array.from(skills.values());
      if (options.tag) {
        const tagIds = tagIndex.get(options.tag);
        if (tagIds) result = result.filter(s => tagIds.has(s.id));
        else return [];
      }
      const sortBy = options.sortBy || 'name';
      result.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'updated') return b.updated - a.updated;
        if (sortBy === 'triggerCount') return (b.triggerCount || 0) - (a.triggerCount || 0);
        return 0;
      });
      return options.limit ? result.slice(0, options.limit) : result;
    },
    
    search(query: string, limit: number = 5): SkillSearchResult[] {
      const queryTokens = tokenize(query);
      if (queryTokens.length === 0) return [];
      const results: SkillSearchResult[] = [];
      
      for (const skill of skills.values()) {
        let relevance = 0;
        const matchedOn: SkillSearchResult['matchedOn'] = [];
        
        for (const qt of queryTokens) {
          if (tokenize(skill.name).some(t => t.includes(qt) || qt.includes(t))) {
            relevance += 3; if (!matchedOn.includes('name')) matchedOn.push('name');
          }
          if (tokenize(skill.description).some(t => t.includes(qt) || qt.includes(t))) {
            relevance += 2; if (!matchedOn.includes('description')) matchedOn.push('description');
          }
          if (tokenize(skill.body).some(t => t.includes(qt) || qt.includes(t))) {
            relevance += 1; if (!matchedOn.includes('body')) matchedOn.push('body');
          }
        }
        for (const tag of skill.tags || []) {
          if (tokenize(tag).some(t => queryTokens.includes(t))) {
            relevance += 2; if (!matchedOn.includes('tag')) matchedOn.push('tag');
          }
        }
        
        if (relevance > 0) results.push({ skill, relevance, matchedOn });
      }
      
      results.sort((a, b) => b.relevance - a.relevance);
      return results.slice(0, limit);
    },
    
    incrementTrigger(id: string): void {
      const skill = skills.get(id);
      if (skill) skill.triggerCount = (skill.triggerCount || 0) + 1;
    },
    
    generateIndex(): string {
      const lines = ['## Available Skills\n'];
      for (const skill of this.list({ limit: 20 })) {
        lines.push(`### ${skill.name}\n${skill.description}`);
        if (skill.tags?.length) lines.push(`Tags: ${skill.tags.join(', ')}`);
        lines.push('');
      }
      return lines.join('\n');
    }
  };
}

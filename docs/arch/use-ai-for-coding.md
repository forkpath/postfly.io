## Agents.md

需要在根目录下完成Agents.md的编写，这份文件好比公司的规章制度，需要对整个项目做一个说明

### Claude.md

针对claude code，编写的行为策略

### Codex.md

针对codex，编写的行为策略

## 模型配置

### .claude

- commands: 简单prompt模版，适合快速任务，譬如/commit适合用command
- skills：多步骤复杂任务，可以包含多个文件和配置，譬如/review-commit-push这种需要多部检查的适合skill
  在一份SKILL.md中，metadata配置很关键

```yaml
description: 简单说明干什么
user-invocable: true # 是否通过/调用
argument-hint: [--no-push] [files] # 参数提示
model: haiku # 指定模型
context: fork # 独立上下文，默认用的inherit会占用主对话上下文，使用fork，任务在独立的sub-agent中执行，只返回结果，主对话保持干净
tools: Bash, Read, Write # 允许的工具
```

### .codex

- skills

module.exports = {
    types: [
        { value: 'feat', name: 'feat:     ✨  新功能' },
        { value: 'fix', name: 'fix:      🐛  修复缺陷' },
        { value: 'docs', name: 'docs:     📝  文档更新' },
        { value: 'style', name: 'style:    💄  代码格式' },
        { value: 'refactor', name: 'refactor: 🔨  代码重构' },
        { value: 'perf', name: 'perf:     🚀  性能优化' },
        { value: 'test', name: 'test:     ✅  测试相关' },
        { value: 'arch', name: 'arch:     🏗️  架构相关' },
        { value: 'build', name: 'build:    📦  构建相关' },
        { value: 'ci', name: 'ci:       🤖  CI配置' },
        { value: 'chore', name: 'chore:    🧹  其他杂项' },
        { value: 'revert', name: 'revert:   ⏪  回滚提交' }
    ],
    scopes: [
        { name: 'desktop' },
        { name: 'mobile' },
        { name: 'web' },
        { name: 'engine' },
        { name: 'pulse' },
        { name: 'studio' },
        { name: 'libs' },
        { name: 'docker' },
        { name: 'none' }
    ],
    allowCustomScopes: true,
    allowBreakingChanges: ['feat', 'fix'],
    subjectLimit: 100,
    skipQuestions: ['body', 'footer'] // 可以跳过某些问题
}

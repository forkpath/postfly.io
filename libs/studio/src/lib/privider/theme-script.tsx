/**
 * ThemeScript - 在 HTML 解析时立即执行的内联脚本
 * 用于在页面渲染前设置主题模式，避免 FOUC（Flash of Unstyled Content）
 *
 * 注意：此脚本只处理 mode (dark/light)，color 会在 body 渲染后通过 React 设置
 * 必须放在 <head> 中使用
 */

const THEME_MODE_SCRIPT = `
(function() {
  try {
    var mode = localStorage.getItem('theme-mode') || 'system';
    var isDark = mode === 'dark' || 
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
`

/**
 * 防闪烁脚本 - 处理 dark/light 模式
 * 放在 <head> 中，在 HTML 解析时立即设置 <html> 的 class
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_MODE_SCRIPT }} />
}

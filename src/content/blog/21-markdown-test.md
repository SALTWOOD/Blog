---
title: '测试'
description: ''
pubDate: 2026-04-14T17:35:44.155Z
updatedDate: 2026-04-14T17:35:44.155Z
tags: []
category: ''
---

# 标题测试 (H1)
## 子标题测试 (H2)

这是一段包含 **粗体 (Bold)**、*斜体 (Italic)*、~~删除线 (Strikethrough)~~ 以及 <u>下划线 (Underline)</u> 的基础文本。

---

### 1. 列表与引用
* 无序列表项 A
* 无序列表项 B
    * 嵌套列表项
> 这是一段引用文本（Blockquote），用于测试引用的样式是否与整体 UI 契合。

---

### 2. 表格测试
| 功能 | 状态 | 说明 |
| :--- | :---: | --- |
| 文本编辑 | ✅ | 支持良好 |
| 实时预览 | ✅ | 已开启 |
| 样式覆盖 | 🛠️ | 适配中 |

---

### 3. 数学公式 (LaTeX)
* **行内公式**：质能方程：$E = mc^2$
* **块级公式**（魏尔斯特拉斯函数）：
$$
f(x) = \sum_{n=0}^{\infty} a^n \cos(b^n \pi x)
$$

---

### 4. 代码测试
* **行内代码**：使用 `const article = ref(null)` 定义响应式变量。
* **块级代码**（TypeScript）：

```typescript
/**
 * @description 这是一个代码块转义测试
 */
export const greet = (name: string): string => {
  return `Hello, ${name}! Welcome to Secret Base.`;
};
```

---

### 5. 任务列表
- [x] 完成 md-editor-v3 重构
- [x] 修复数据加载监听 Bug
- [ ] 集成图片上传功能
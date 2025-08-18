"use client";

import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface EnhancedEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showLineNumbers?: boolean;
  highlightCurrentLine?: boolean;
  language?: string;
}

export function EnhancedEditor({
  value,
  onChange,
  placeholder,
  className = "",
  showLineNumbers = false,
  highlightCurrentLine = false,
  language = "text"
}: EnhancedEditorProps) {
  const [currentLine, setCurrentLine] = useState(1);
  const [lineHeight, setLineHeight] = useState(24); // 动态行高
  const [paddingTop, setPaddingTop] = useState(12); // 动态获取padding
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // 计算行数
  const lines = value.split('\n');
  const lineCount = lines.length;

  // 计算实际行高和padding
  const calculateLayoutMetrics = () => {
    if (!textareaRef.current) return { lineHeight: 24, paddingTop: 12 };
    
    const textarea = textareaRef.current;
    const styles = window.getComputedStyle(textarea);
    const fontSize = parseFloat(styles.fontSize);
    const lineHeightStyle = styles.lineHeight;
    const paddingTopStyle = parseFloat(styles.paddingTop);
    
    let calculatedLineHeight;
    if (lineHeightStyle === 'normal') {
      calculatedLineHeight = fontSize * 1.2;
    } else if (lineHeightStyle.endsWith('px')) {
      calculatedLineHeight = parseFloat(lineHeightStyle);
    } else if (!isNaN(parseFloat(lineHeightStyle))) {
      calculatedLineHeight = fontSize * parseFloat(lineHeightStyle);
    } else {
      calculatedLineHeight = fontSize * 1.2;
    }
    
    return {
      lineHeight: Math.ceil(calculatedLineHeight),
      paddingTop: paddingTopStyle || 12
    };
  };

  // 处理光标位置变化
  const handleCursorPositionChange = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const text = textarea.value;
    const cursorPosition = textarea.selectionStart;
    
    // 计算当前行号
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lineNumber = textBeforeCursor.split('\n').length;
    setCurrentLine(lineNumber);
  };

  // 同步滚动
  const handleScroll = () => {
    if (!textareaRef.current || !lineNumbersRef.current) return;
    
    lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
  };

  // 计算并更新布局参数
  useEffect(() => {
    const updateLayoutMetrics = () => {
      const metrics = calculateLayoutMetrics();
      setLineHeight(metrics.lineHeight);
      setPaddingTop(metrics.paddingTop);
    };

    const textarea = textareaRef.current;
    if (!textarea) return;

    // 初始计算
    updateLayoutMetrics();

    // 监听字体加载完成
    if (document.fonts) {
      document.fonts.ready.then(updateLayoutMetrics);
    }

    // 监听resize事件（字体大小可能改变）
    const resizeObserver = new ResizeObserver(updateLayoutMetrics);
    resizeObserver.observe(textarea);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 监听textarea的事件
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('keyup', handleCursorPositionChange);
    textarea.addEventListener('mouseup', handleCursorPositionChange);
    textarea.addEventListener('scroll', handleScroll);

    return () => {
      textarea.removeEventListener('keyup', handleCursorPositionChange);
      textarea.removeEventListener('mouseup', handleCursorPositionChange);
      textarea.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 生成行号
  const renderLineNumbers = () => {
    const numbers = [];
    for (let i = 1; i <= lineCount; i++) {
      numbers.push(
        <div
          key={i}
          className={`text-right px-2 text-xs font-mono select-none flex items-center justify-end ${
            highlightCurrentLine && i === currentLine
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-muted-foreground'
          }`}
          style={{ 
            height: `${lineHeight}px`,
            lineHeight: `${lineHeight}px`
          }}
        >
          {i}
        </div>
      );
    }
    return numbers;
  };

  return (
    <div className={`relative flex border rounded-md overflow-hidden ${className}`}>
      {/* 行号区域 */}
      {showLineNumbers && (
        <div
          ref={lineNumbersRef}
          className="bg-muted/50 border-r overflow-hidden"
          style={{ 
            width: `${Math.max(String(lineCount).length * 9 + 16, 48)}px`, // 根据字体调整宽度
            maxHeight: '100%',
            fontSize: '14px', // 确保行号字体大小一致
            paddingTop: `${paddingTop}px`, // 与textarea的padding保持一致
            paddingBottom: `${paddingTop}px`
          }}
        >
          <div className="sticky top-0">
            {renderLineNumbers()}
          </div>
        </div>
      )}
      
      {/* 编辑器区域 */}
      <div className="flex-1 relative">
        {/* 当前行高亮背景 */}
        {highlightCurrentLine && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, transparent ${paddingTop + (currentLine - 1) * lineHeight}px, rgba(59, 130, 246, 0.1) ${paddingTop + (currentLine - 1) * lineHeight}px, rgba(59, 130, 246, 0.1) ${paddingTop + currentLine * lineHeight}px, transparent ${paddingTop + currentLine * lineHeight}px)`
            }}
          />
        )}
        
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="resize-none border-0 outline-none focus-visible:ring-0 bg-transparent font-mono text-sm"
          style={{
            minHeight: '300px',
            paddingLeft: showLineNumbers ? '8px' : '12px',
            lineHeight: `${lineHeight}px`,
            fontSize: '14px' // 确保字体大小一致
          }}
        />
      </div>
    </div>
  );
}

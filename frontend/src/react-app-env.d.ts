/// <reference types="react-scripts" />

// Разрешаем импорт CSS файлов
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Разрешаем импорт других типов файлов
declare module '*.scss';
declare module '*.sass';
declare module '*.less';
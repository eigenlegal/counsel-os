import { createElement, forwardRef, type HTMLAttributes } from 'react';

type WorkspaceFrameProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'main';
  mode?: 'page' | 'canvas';
};

/** The breadcrumb, banner and page share a frame; chat owns its inner canvas. */
export const WorkspaceFrame = forwardRef<HTMLElement, WorkspaceFrameProps>(
  function WorkspaceFrame({ as = 'div', mode = 'page', className = '', ...props }, ref) {
    return createElement(as, {
      ...props,
      ref,
      className: `workspace-frame workspace-frame-${mode} ${className}`.trim(),
    });
  },
);

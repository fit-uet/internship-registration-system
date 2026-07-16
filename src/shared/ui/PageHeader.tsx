import type { ReactNode } from 'react';
import { cn } from './cn';

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('ui-page-header', className)}>
      <div className="ui-page-header__main">
        {icon && <div className="ui-page-header__icon">{icon}</div>}
        <div>
          <h2 className="ui-page-header__title">{title}</h2>
          {description && <div className="ui-page-header__description">{description}</div>}
        </div>
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </div>
  );
}

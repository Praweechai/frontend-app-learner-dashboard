import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const BASE = '/learner-dashboard';

// Kit links to Classroom pages stay inside this app (react-router, basename /learner-dashboard);
// everything else (course home, player, account, sign-out) is a normal link.
export const toRoute = (href = '') => {
  if (!href.startsWith(BASE)) { return null; }
  const rest = href.slice(BASE.length) || '/';
  return rest.startsWith('/') ? rest : `/${rest}`;
};

const RouterLink = forwardRef(({ href, children, ...rest }, ref) => {
  const to = toRoute(href);
  if (to === null) { return <a ref={ref} href={href} {...rest}>{children}</a>; }
  return <Link ref={ref} to={to} {...rest}>{children}</Link>;
});

RouterLink.displayName = 'RouterLink';
RouterLink.propTypes = { href: PropTypes.string, children: PropTypes.node };

export default RouterLink;

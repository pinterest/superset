import { useSelector } from 'react-redux';
import { styled, SupersetTheme } from '@superset-ui/core';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';

const StyledDiv = styled('div')`
  font-weight: ${({ theme }: { theme: SupersetTheme }) =>
    theme.typography.weights.bold};
  font-size: 36px;
  color: ${({ theme }: { theme: SupersetTheme }) =>
    theme.colors.primary.light2};
  padding: 36px;
`;

export default function PinterestBanner() {
  const user: UserWithPermissionsAndRoles = useSelector<
    any,
    UserWithPermissionsAndRoles
  >(state => state.user);

  return <StyledDiv>Welcome to Superset, {user.firstName}!</StyledDiv>;
}

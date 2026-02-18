import { UserWithPermissionsAndRoles, UndefinedUser } from '@superset-frontend/src/types/bootstrapTypes';

type PinterestTieringInfoModalProps = {
  dashboardId: number;
  show?: boolean;
  onHide: () => void;
  addSuccessToast: (message: string) => void;
  addDangerToast: (message: string) => void;
  user: UserWithPermissionsAndRoles | UndefinedUser;
};

const PinterestTieringInfoModal = (_props: PinterestTieringInfoModalProps) => (
  <></>
);

export default PinterestTieringInfoModal;
import withToasts from '@superset-frontend/src/components/MessageToasts/withToasts';
import {
  UserWithPermissionsAndRoles,
  UndefinedUser,
} from '@superset-frontend/src/types/bootstrapTypes';

type PinterestPromoteTier1ModalProps = {
  dashboardId: number;
  show?: boolean;
  onHide: () => void;
  addSuccessToast: (message: string) => void;
  addDangerToast: (message: string) => void;
  user: UserWithPermissionsAndRoles | UndefinedUser;
};

const PinterestPromoteTier1Modal = (
  _props: PinterestPromoteTier1ModalProps,
) => <></>;

export default withToasts(PinterestPromoteTier1Modal);

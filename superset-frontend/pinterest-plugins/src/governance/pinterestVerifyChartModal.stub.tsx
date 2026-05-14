import withToasts from '@superset-frontend/src/components/MessageToasts/withToasts';
import {
  UserWithPermissionsAndRoles,
  UndefinedUser,
} from '@superset-frontend/src/types/bootstrapTypes';

type PinterestVerifyChartModalProps = {
  sliceId: number;
  show?: boolean;
  onHide: () => void;
  addSuccessToast: (message: string) => void;
  addDangerToast: (message: string) => void;
  user: UserWithPermissionsAndRoles | UndefinedUser;
};

const PinterestVerifyChartModal = (_props: PinterestVerifyChartModalProps) => (
  <></>
);

export default withToasts(PinterestVerifyChartModal);

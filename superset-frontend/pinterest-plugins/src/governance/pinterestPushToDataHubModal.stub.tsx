import withToasts from '@superset-frontend/src/components/MessageToasts/withToasts';

type PinterestPushToDataHubModalProps = {
  dashboardId: number;
  dashboardTitle: string;
  show?: boolean;
  onHide: () => void;
  addSuccessToast: (message: string) => void;
  addDangerToast: (message: string) => void;
};

const PinterestPushToDataHubModal = (
  _props: PinterestPushToDataHubModalProps,
) => <></>;

export default withToasts(PinterestPushToDataHubModal);

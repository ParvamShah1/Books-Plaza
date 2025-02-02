import { Toast } from 'react-hot-toast';

export const toastConfig = {
  style: {
    background: 'white',
    color: 'black',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '12px 24px',
  },
  position: 'bottom-right' as const
};
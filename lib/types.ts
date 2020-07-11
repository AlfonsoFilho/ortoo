export interface Message {
  id?: string;
  sender: string;
  receiver: string;
  type: string | number;
  payload: any;
}

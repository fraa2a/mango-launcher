export function AllFriendsModal({
  visible,
  onClose: _onClose,
  userId: _userId,
  isMe: _isMe,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  isMe: boolean;
}) {
  if (!visible) return null;
  return null;
}

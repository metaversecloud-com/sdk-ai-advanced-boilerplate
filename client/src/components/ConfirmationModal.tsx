import { useState } from "react";

export const ConfirmationModal = ({
  title,
  message,
  handleOnConfirm,
  handleToggleShowConfirmationModal,
}: {
  title: string;
  message: string;
  handleOnConfirm: () => void;
  handleToggleShowConfirmationModal: () => void;
}) => {
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(false);

  const onConfirm = () => {
    setAreButtonsDisabled(true);
    handleOnConfirm();
    handleToggleShowConfirmationModal();
  };

  return (
    <div className="modal-container">
      <div className="modal">
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="actions">
          <button
            id="close"
            className="btn btn-outline"
            onClick={handleToggleShowConfirmationModal}
            disabled={areButtonsDisabled}
          >
            No
          </button>
          <button className="btn btn-danger-outline" onClick={onConfirm} disabled={areButtonsDisabled}>
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

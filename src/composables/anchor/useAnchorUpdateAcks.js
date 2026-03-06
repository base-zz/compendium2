import { onMounted, onUnmounted } from "vue";

export function useAnchorUpdateAcks({
  logger,
  toastController,
  relayConnectionBridge,
  directConnectionAdapter,
  pendingAnchorUpdateAction,
  dropNowValidationError,
  showSetAnchorDialog,
  dropNowSessionActive,
  dropNowCapturedDepth,
  showDropAnchorDialog,
}) {
  const showAnchorResetToast = async (ack) => {
    try {
      const success = ack && ack.success !== false;
      const message = success
        ? "Anchor reset on server"
        : ack && ack.error
          ? `Failed to reset anchor: ${ack.error}`
          : "Failed to reset anchor";

      const toast = await toastController.create({
        message,
        duration: 2500,
        position: "bottom",
        color: success ? "success" : "danger",
        cssClass: "anchor-reset-toast",
      });
      await toast.present();
    } catch (e) {
      logger.error("Error showing anchor reset toast", e);
    }
  };

  const getAnchorUpdateAckErrorMessage = (ack) => {
    if (!ack || typeof ack !== "object") {
      return "Server rejected anchor update.";
    }

    if (typeof ack.error === "string" && ack.error.trim().length > 0) {
      return ack.error;
    }

    if (typeof ack.message === "string" && ack.message.trim().length > 0) {
      return ack.message;
    }

    if (typeof ack.reason === "string" && ack.reason.trim().length > 0) {
      return ack.reason;
    }

    if (Array.isArray(ack.validationErrors) && ack.validationErrors.length > 0) {
      const firstError = ack.validationErrors[0];
      if (typeof firstError === "string" && firstError.trim().length > 0) {
        return firstError;
      }
      if (firstError && typeof firstError.message === "string" && firstError.message.trim().length > 0) {
        return firstError.message;
      }
    }

    return "Server rejected anchor update.";
  };

  onMounted(() => {
    const handleAnchorResetAck = (msg) => {
      showAnchorResetToast(msg);
    };

    const handleAnchorUpdateAck = (ack) => {
      const action = pendingAnchorUpdateAction.value;
      if (typeof action !== "string") {
        return;
      }

      const success = ack && ack.success !== false;

      if (action === "finalize_drop_now") {
        if (success) {
          dropNowValidationError.value = "";
        } else {
          dropNowValidationError.value = getAnchorUpdateAckErrorMessage(ack);
          showSetAnchorDialog.value = true;
        }
        pendingAnchorUpdateAction.value = null;
        return;
      }

      if (action === "drop_now") {
        if (!success) {
          dropNowSessionActive.value = false;
          dropNowCapturedDepth.value = null;
          showDropAnchorDialog.value = true;
        }
        pendingAnchorUpdateAction.value = null;
        return;
      }

      if (action === "cancel_drop_now") {
        pendingAnchorUpdateAction.value = null;
      }
    };

    relayConnectionBridge.on("anchor:reset:ack", handleAnchorResetAck);
    directConnectionAdapter.on("anchor:reset:ack", handleAnchorResetAck);
    relayConnectionBridge.on("anchor:update:ack", handleAnchorUpdateAck);
    directConnectionAdapter.on("anchor:update:ack", handleAnchorUpdateAck);

    onUnmounted(() => {
      relayConnectionBridge.off("anchor:reset:ack", handleAnchorResetAck);
      directConnectionAdapter.off("anchor:reset:ack", handleAnchorResetAck);
      relayConnectionBridge.off("anchor:update:ack", handleAnchorUpdateAck);
      directConnectionAdapter.off("anchor:update:ack", handleAnchorUpdateAck);
    });
  });
}

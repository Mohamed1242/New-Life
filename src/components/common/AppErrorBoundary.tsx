import React, { Component, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed/ThemedText";
import { errorMonitor } from "@/shared/monitoring/errorMonitor";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "Unexpected rendering error",
    };
  }

  componentDidCatch(error: Error): void {
    void errorMonitor.recordError("RootRenderBoundary", error);
  }

  handleRecover = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ThemedText variant="h1" center>
            We hit a small bump
          </ThemedText>
          <ThemedText variant="body" color="secondary" center>
            Your local data is safe. Tap below to restore the view.
          </ThemedText>
          <ThemedText variant="micro" color="muted" center numberOfLines={3}>
            {this.state.message}
          </ThemedText>
          <Pressable onPress={this.handleRecover} style={styles.button}>
            <ThemedText variant="bodyMedium" weight="semiBold" style={styles.btnText}>
              Recover Screen
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F3FB",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E2F5",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#6C5CE7",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: {
    color: "#FFFFFF",
  },
});

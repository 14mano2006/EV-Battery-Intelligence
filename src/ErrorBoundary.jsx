import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("ErrorBoundary caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return (
        <div
          id="map-error-boundary-fallback"
          style={{
            width: "100%",
            minHeight: "450px",
            padding: "40px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
            Map View Temporarily Interrupted
          </h3>
          <p style={{ fontSize: 13, color: "#64748b", maxWidth: 440, lineHeight: 1.5, margin: "0 0 20px" }}>
            {this.state.error?.message?.includes("Script error")
              ? "An external map provider script was blocked by browser security. Click below to reload in safe OpenStreetMap mode."
              : this.state.error?.message || "An unexpected error occurred while rendering the map."}
          </p>
          <button
            id="btn-retry-map"
            onClick={this.handleReset}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#ffffff",
              border: 0,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
            }}
          >
            Reload Map in Safe Mode
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

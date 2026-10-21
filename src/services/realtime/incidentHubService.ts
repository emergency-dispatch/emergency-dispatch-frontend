import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { API_CONFIG } from '../../config/api';
import type { DispatchAssignmentResponseDto } from '../../types/dispatch';

type JobAssignedListener = (assignment: DispatchAssignmentResponseDto) => void;
type AssignmentStatusListener = (data: any) => void;
type TrafficHotspotListener = (hotspot: any) => void;

class IncidentHubService {
  private connection: HubConnection | null = null;
  private jobAssignedListeners = new Set<JobAssignedListener>();
  private assignmentStatusListeners = new Set<AssignmentStatusListener>();
  private trafficHotspotListeners = new Set<TrafficHotspotListener>();
  private isConnecting = false;

  private getHubUrl(): string {
    const baseUrl = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}/hubs/incidents`;
  }

  public async start(): Promise<boolean> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      return true;
    }

    if (this.isConnecting) {
      return false;
    }

    const token = localStorage.getItem(API_CONFIG.TOKEN_KEY);
    if (!token) {
      return false;
    }

    try {
      this.isConnecting = true;

      this.connection = new HubConnectionBuilder()
        .withUrl(this.getHubUrl(), {
          accessTokenFactory: () => localStorage.getItem(API_CONFIG.TOKEN_KEY) || '',
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Warning)
        .build();

      // Register server events (RealtimeContract)
      this.connection.on('ReceiveJobAssigned', (assignment: DispatchAssignmentResponseDto) => {
        this.jobAssignedListeners.forEach((listener) => {
          try {
            listener(assignment);
          } catch (err) {
            console.error('[IncidentHub] Error in JobAssigned listener:', err);
          }
        });
      });

      this.connection.on('ReceiveAssignmentStatus', (data: any) => {
        this.assignmentStatusListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error('[IncidentHub] Error in AssignmentStatus listener:', err);
          }
        });
      });

      this.connection.on('ReceiveTrafficHotspot', (hotspot: any) => {
        this.trafficHotspotListeners.forEach((listener) => {
          try {
            listener(hotspot);
          } catch (err) {
            console.error('[IncidentHub] Error in TrafficHotspot listener:', err);
          }
        });
      });

      await this.connection.start();
      return true;
    } catch (err) {
      console.warn('[IncidentHub] SignalR connection failed (will fallback to polling):', err);
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  public async stop(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {
        // Ignore stop error
      } finally {
        this.connection = null;
      }
    }
  }

  public isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  public onJobAssigned(listener: JobAssignedListener): () => void {
    this.jobAssignedListeners.add(listener);
    return () => {
      this.jobAssignedListeners.delete(listener);
    };
  }

  public onAssignmentStatus(listener: AssignmentStatusListener): () => void {
    this.assignmentStatusListeners.add(listener);
    return () => {
      this.assignmentStatusListeners.delete(listener);
    };
  }

  public onTrafficHotspot(listener: TrafficHotspotListener): () => void {
    this.trafficHotspotListeners.add(listener);
    return () => {
      this.trafficHotspotListeners.delete(listener);
    };
  }
}

export const incidentHubService = new IncidentHubService();

/**
 * MEMBER LOCKER DRAWER
 * Slides in from the right edge. Shows member profile, preference matrix,
 * and current humidor locker stick inventory.
 * Animated with spring physics for weighted, tactile feel.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface MemberProfile {
  lockerId: string;
  name: string;
  memberSince: string;
  tier: "Ember" | "Obsidian" | "Gold" | "Sovereign";
  preferredCut: string;
  preferredLight: string;
  stickInventory: { name: string; qty: number }[];
  notes?: string;
}

interface Props {
  open: boolean;
  member: MemberProfile | null;
  onClose: () => void;
}

const { width } = Dimensions.get("window");
const DRAWER_W = Math.min(width * 0.72, 360);

const TIER_COLOR: Record<string, string> = {
  Ember:     "#C4610A",
  Obsidian:  "#6B6B80",
  Gold:      "#D4AF37",
  Sovereign: "#FFB300",
};

export default function MemberLockerDrawer({ open, member, onClose }: Props) {
  const translateX = useRef(new Animated.Value(DRAWER_W)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: open ? 0 : DRAWER_W,
      useNativeDriver: true,
      bounciness: 3,
      speed: 14,
    }).start();
  }, [open]);

  return (
    <>
      {open && (
        <Pressable style={styles.scrim} onPress={onClose} />
      )}
      <Animated.View style={[styles.drawer, { width: DRAWER_W, transform: [{ translateX }] }]}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>HUMIDOR MEMBER LOG</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={14}>
            <Ionicons name="close" size={18} color="rgba(255,59,48,0.8)" />
          </Pressable>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {member ? (
            <>
              {/* Tier badge */}
              {member.tier && (
                <View style={[styles.tierBadge, { borderColor: TIER_COLOR[member.tier] + "66", backgroundColor: TIER_COLOR[member.tier] + "11" }]}>
                  <Text style={[styles.tierText, { color: TIER_COLOR[member.tier] }]}>
                    {member.tier.toUpperCase()} MEMBER
                  </Text>
                </View>
              )}

              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.lockerId}>
                Locker {member.lockerId} · Since {member.memberSince}
              </Text>

              <View style={styles.divider} />

              {/* Preference matrix */}
              <Text style={styles.sectionLabel}>PREFERENCE MATRIX</Text>
              <View style={styles.prefGrid}>
                <View style={styles.prefCard}>
                  <Text style={styles.prefLabel}>CUT</Text>
                  <Text style={styles.prefValue}>{member.preferredCut}</Text>
                </View>
                <View style={styles.prefCard}>
                  <Text style={styles.prefLabel}>LIGHT</Text>
                  <Text style={styles.prefValue}>{member.preferredLight}</Text>
                </View>
              </View>

              {member.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{member.notes}</Text>
                </View>
              )}

              <View style={styles.divider} />

              {/* Stick inventory */}
              <View style={styles.inventoryHeader}>
                <Text style={styles.sectionLabel}>LOCKER BALANCE</Text>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalBadgeText}>
                    {member.stickInventory.reduce((s, i) => s + i.qty, 0)} sticks
                  </Text>
                </View>
              </View>

              {member.stickInventory.map((stick, i) => (
                <View key={i} style={styles.stickRow}>
                  <Text style={styles.stickName}>{stick.name}</Text>
                  <View style={styles.stickQtyBadge}>
                    <Text style={styles.stickQty}>×{stick.qty}</Text>
                  </View>
                </View>
              ))}

              <View style={{ height: 40 }} />
            </>
          ) : (
            <View style={styles.noMemberWrap}>
              <Ionicons name="person-circle-outline" size={48} color="rgba(255,255,255,0.12)" />
              <Text style={styles.noMemberText}>No member profile linked to this table</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 9,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(13,13,16,0.97)",
    borderLeftWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 24,
    paddingTop: 52,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  headerLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  tierBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  tierText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  memberName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "300",
    letterSpacing: -0.3,
  },
  lockerId: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 22,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  prefGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  prefCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 12,
    gap: 4,
  },
  prefLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  prefValue: {
    color: "#F0EDE8",
    fontSize: 14,
    fontWeight: "500",
  },
  notesBox: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(212,175,55,0.35)",
  },
  notesText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    lineHeight: 20,
  },
  inventoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  totalBadge: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },
  totalBadgeText: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
  },
  stickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  stickName: {
    color: "#E5E5EA",
    fontSize: 14,
    fontWeight: "400",
    flex: 1,
  },
  stickQtyBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stickQty: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
  },
  noMemberWrap: {
    paddingTop: 60,
    alignItems: "center",
    gap: 16,
  },
  noMemberText: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});

import type { z } from "zod";
export declare const sendMessageRequestSchema: z.ZodObject<{
    conversationId: z.ZodString;
    content: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"markdown">;
        markdown: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodEnum<{
            file: "file";
            image: "image";
            video: "video";
            audio: "audio";
        }>;
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        mimeType: z.ZodOptional<z.ZodString>;
        sizeBytes: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"card">;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"carousel">;
        items: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            imageUrl: z.ZodOptional<z.ZodString>;
            buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                value: z.ZodOptional<z.ZodString>;
                url: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"quick_replies">;
        text: z.ZodString;
        replies: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"table">;
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"form">;
        title: z.ZodString;
        fields: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            inputType: z.ZodEnum<{
                number: "number";
                date: "date";
                email: "email";
                text: "text";
                tel: "tel";
                textarea: "textarea";
            }>;
            required: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>;
        submitLabel: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"location">;
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        label: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodEnum<{
            error: "error";
            system: "system";
            typing: "typing";
        }>;
        text: z.ZodOptional<z.ZodString>;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"calendar">;
        title: z.ZodString;
        availableSlots: z.ZodArray<z.ZodString>;
    }, z.core.$strip>], "type">;
}, z.core.$strip>;
export declare const conversationHistoryResponseSchema: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        conversationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        role: z.ZodEnum<{
            user: "user";
            assistant: "assistant";
            system: "system";
        }>;
        createdAt: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        content: z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"markdown">;
            markdown: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                video: "video";
                audio: "audio";
            }>;
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            mimeType: z.ZodOptional<z.ZodString>;
            sizeBytes: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"card">;
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            imageUrl: z.ZodOptional<z.ZodString>;
            buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                value: z.ZodOptional<z.ZodString>;
                url: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"carousel">;
            items: z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                imageUrl: z.ZodOptional<z.ZodString>;
                buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    label: z.ZodString;
                    value: z.ZodOptional<z.ZodString>;
                    url: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"quick_replies">;
            text: z.ZodString;
            replies: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                value: z.ZodOptional<z.ZodString>;
                url: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"table">;
            columns: z.ZodArray<z.ZodString>;
            rows: z.ZodArray<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"form">;
            title: z.ZodString;
            fields: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                inputType: z.ZodEnum<{
                    number: "number";
                    date: "date";
                    email: "email";
                    text: "text";
                    tel: "tel";
                    textarea: "textarea";
                }>;
                required: z.ZodDefault<z.ZodBoolean>;
            }, z.core.$strip>>;
            submitLabel: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"location">;
            latitude: z.ZodNumber;
            longitude: z.ZodNumber;
            label: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodEnum<{
                error: "error";
                system: "system";
                typing: "typing";
            }>;
            text: z.ZodOptional<z.ZodString>;
            code: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"calendar">;
            title: z.ZodString;
            availableSlots: z.ZodArray<z.ZodString>;
        }, z.core.$strip>], "type">;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const chatStreamEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"typing">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"token">;
    token: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"message">;
    message: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        conversationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        role: z.ZodEnum<{
            user: "user";
            assistant: "assistant";
            system: "system";
        }>;
        createdAt: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        content: z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"markdown">;
            markdown: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                video: "video";
                audio: "audio";
            }>;
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            mimeType: z.ZodOptional<z.ZodString>;
            sizeBytes: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"card">;
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            imageUrl: z.ZodOptional<z.ZodString>;
            buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                value: z.ZodOptional<z.ZodString>;
                url: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"carousel">;
            items: z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                imageUrl: z.ZodOptional<z.ZodString>;
                buttons: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    label: z.ZodString;
                    value: z.ZodOptional<z.ZodString>;
                    url: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"quick_replies">;
            text: z.ZodString;
            replies: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                value: z.ZodOptional<z.ZodString>;
                url: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"table">;
            columns: z.ZodArray<z.ZodString>;
            rows: z.ZodArray<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"form">;
            title: z.ZodString;
            fields: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                inputType: z.ZodEnum<{
                    number: "number";
                    date: "date";
                    email: "email";
                    text: "text";
                    tel: "tel";
                    textarea: "textarea";
                }>;
                required: z.ZodDefault<z.ZodBoolean>;
            }, z.core.$strip>>;
            submitLabel: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"location">;
            latitude: z.ZodNumber;
            longitude: z.ZodNumber;
            label: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodEnum<{
                error: "error";
                system: "system";
                typing: "typing";
            }>;
            text: z.ZodOptional<z.ZodString>;
            code: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"calendar">;
            title: z.ZodString;
            availableSlots: z.ZodArray<z.ZodString>;
        }, z.core.$strip>], "type">;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    message: z.ZodString;
}, z.core.$strip>], "type">;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
export type ConversationHistoryResponse = z.infer<typeof conversationHistoryResponseSchema>;
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;
//# sourceMappingURL=chat.d.ts.map
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import {
    X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    Highlighter, MessageSquare, ArrowUpRight, Square,
    Pencil, Type, Save, Download, Maximize2,
    Trash2, CheckCircle2, AlertCircle, Loader2,
    PanelLeft, PanelRight, Minus
} from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';

// Set up worker from CDN for better reliability in production
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// --- Pen Color & Stroke Presets ---
const PEN_COLORS = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Black', value: '#1e293b' },
];
const PEN_WIDTHS = [2, 3, 5, 8];

const DrawingPage = React.memo(({ 
    pdf, 
    pageNumber, 
    zoom, 
    annotations, 
    activeTool, 
    onSaveAnnotation, 
    onDeleteAnnotation,
    selectedAnnotationId,
    setSelectedAnnotationId,
    drawingId,
    versionId,
    onVisible,
    penColor,
    penWidth,
    onUpdateAnnotationLocally,
    onUpdateAnnotation
}) => {
    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentAnnotation, setCurrentAnnotation] = useState(null);
    // Pen-specific state: accumulate points while drawing
    const penPointsRef = useRef([]);

    // Text input modal state
    const [textInputModal, setTextInputModal] = useState(null); // { pendingAnnotation?, editingAnn? }
    const [textInputValue, setTextInputValue] = useState('');

    // Drag-specific states and refs
    const [draggingAnnotation, setDraggingAnnotation] = useState(null);
    const dragStartCoordsRef = useRef({ x: 0, y: 0 });
    const annotationStartCoordsRef = useRef(null);

    // Resize-specific states and refs
    const [resizingAnnotation, setResizingAnnotation] = useState(null);
    const [resizeHandleType, setResizeHandleType] = useState(null);
    const resizeStartCoordsRef = useRef({ x: 0, y: 0 });
    const annotationResizeStartCoordsRef = useRef(null);

    useEffect(() => {
        if (!draggingAnnotation) return;

        const handleWindowMouseMove = (e) => {
            const coords = getCoordinates(e);
            const dx = coords.x - dragStartCoordsRef.current.x;
            const dy = coords.y - dragStartCoordsRef.current.y;
            
            let updatedCoords;
            if (draggingAnnotation.type === 'pen') {
                updatedCoords = {
                    ...draggingAnnotation.coordinates,
                    points: annotationStartCoordsRef.current.points.map(p => ({
                        x: p.x + dx,
                        y: p.y + dy
                    }))
                };
            } else if (draggingAnnotation.type === 'comment') {
                updatedCoords = {
                    ...draggingAnnotation.coordinates,
                    x: annotationStartCoordsRef.current.x + dx,
                    y: annotationStartCoordsRef.current.y + dy
                };
            } else {
                updatedCoords = {
                    ...draggingAnnotation.coordinates,
                    x1: annotationStartCoordsRef.current.x1 + dx,
                    y1: annotationStartCoordsRef.current.y1 + dy,
                    x2: annotationStartCoordsRef.current.x2 + dx,
                    y2: annotationStartCoordsRef.current.y2 + dy
                };
            }
            onUpdateAnnotationLocally(draggingAnnotation._id, updatedCoords);
        };

        const handleWindowMouseUp = () => {
            const finalCoords = annotations.find(a => a._id === draggingAnnotation._id)?.coordinates;
            const initialCoords = annotationStartCoordsRef.current;
            let coordinatesChanged = false;
            
            if (initialCoords && finalCoords) {
                if (draggingAnnotation.type === 'pen') {
                    if (initialCoords.points && finalCoords.points && initialCoords.points.length === finalCoords.points.length) {
                        for (let i = 0; i < initialCoords.points.length; i++) {
                            if (initialCoords.points[i].x !== finalCoords.points[i].x || initialCoords.points[i].y !== finalCoords.points[i].y) {
                                coordinatesChanged = true;
                                break;
                            }
                        }
                    }
                } else if (draggingAnnotation.type === 'comment') {
                    coordinatesChanged = initialCoords.x !== finalCoords.x || initialCoords.y !== finalCoords.y;
                } else {
                    coordinatesChanged = initialCoords.x1 !== finalCoords.x1 || initialCoords.y1 !== finalCoords.y1 ||
                                         initialCoords.x2 !== finalCoords.x2 || initialCoords.y2 !== finalCoords.y2;
                }
            }

            if (coordinatesChanged && finalCoords) {
                onUpdateAnnotation(draggingAnnotation._id, { coordinates: finalCoords });
            }
            setDraggingAnnotation(null);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [draggingAnnotation, onUpdateAnnotationLocally, onUpdateAnnotation, annotations]);

    useEffect(() => {
        if (!resizingAnnotation || !resizeHandleType) return;

        const handleWindowMouseMove = (e) => {
            const coords = getCoordinates(e);
            const dx = coords.x - resizeStartCoordsRef.current.x;
            const dy = coords.y - resizeStartCoordsRef.current.y;
            
            let { x1, y1, x2, y2 } = annotationResizeStartCoordsRef.current;
            
            if (resizeHandleType === 'tl') {
                x1 += dx;
                y1 += dy;
            } else if (resizeHandleType === 'tr') {
                x2 += dx;
                y1 += dy;
            } else if (resizeHandleType === 'bl') {
                x1 += dx;
                y2 += dy;
            } else if (resizeHandleType === 'br') {
                x2 += dx;
                y2 += dy;
            } else if (resizeHandleType === 't') {
                y1 += dy;
            } else if (resizeHandleType === 'b') {
                y2 += dy;
            } else if (resizeHandleType === 'l') {
                x1 += dx;
            } else if (resizeHandleType === 'r') {
                x2 += dx;
            }
            
            const updatedCoords = {
                ...resizingAnnotation.coordinates,
                x1, y1, x2, y2
            };
            onUpdateAnnotationLocally(resizingAnnotation._id, updatedCoords);
        };

        const handleWindowMouseUp = () => {
            const finalCoords = annotations.find(a => a._id === resizingAnnotation._id)?.coordinates;
            const initialCoords = annotationResizeStartCoordsRef.current;
            let coordinatesChanged = false;
            
            if (initialCoords && finalCoords) {
                coordinatesChanged = initialCoords.x1 !== finalCoords.x1 ||
                                     initialCoords.y1 !== finalCoords.y1 ||
                                     initialCoords.x2 !== finalCoords.x2 ||
                                     initialCoords.y2 !== finalCoords.y2;
            }

            if (coordinatesChanged && finalCoords) {
                onUpdateAnnotation(resizingAnnotation._id, { coordinates: finalCoords });
            }
            setResizingAnnotation(null);
            setResizeHandleType(null);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [resizingAnnotation, resizeHandleType, onUpdateAnnotationLocally, onUpdateAnnotation, annotations]);

    const handleAnnotationDragStart = (ann, e) => {
        if (activeTool) return;
        e.stopPropagation();
        e.preventDefault();
        
        setSelectedAnnotationId(ann._id);
        
        const coords = getCoordinates(e);
        setDraggingAnnotation(ann);
        dragStartCoordsRef.current = { x: coords.x, y: coords.y };
        
        if (ann.type === 'pen') {
            annotationStartCoordsRef.current = {
                points: ann.coordinates.points.map(p => ({ ...p }))
            };
        } else if (ann.type === 'comment') {
            annotationStartCoordsRef.current = {
                x: ann.coordinates.x,
                y: ann.coordinates.y
            };
        } else {
            annotationStartCoordsRef.current = {
                x1: ann.coordinates.x1,
                y1: ann.coordinates.y1,
                x2: ann.coordinates.x2,
                y2: ann.coordinates.y2
            };
        }
    };

    const handleResizeStart = (ann, handleType, e) => {
        e.stopPropagation();
        e.preventDefault();
        
        setSelectedAnnotationId(ann._id);
        
        const coords = getCoordinates(e);
        setResizingAnnotation(ann);
        setResizeHandleType(handleType);
        resizeStartCoordsRef.current = { x: coords.x, y: coords.y };
        annotationResizeStartCoordsRef.current = {
            x1: ann.coordinates.x1,
            y1: ann.coordinates.y1,
            x2: ann.coordinates.x2,
            y2: ann.coordinates.y2
        };
    };

    const handleTextEdit = (ann, e) => {
        e.stopPropagation();
        e.preventDefault();
        setTextInputValue(ann.content || '');
        setTextInputModal({ editingAnn: ann });
    };

    const handleTextInputConfirm = (skipContent = false) => {
        const val = skipContent ? '' : textInputValue.trim();
        const isBox = textInputModal?.toolType === 'box';
        if (!val && !isBox && !skipContent) { setTextInputModal(null); setTextInputValue(''); return; }
        if (textInputModal.editingAnn) {
            const ann = textInputModal.editingAnn;
            onUpdateAnnotationLocally(ann._id, ann.coordinates, val);
            onUpdateAnnotation(ann._id, { content: val });
        } else if (textInputModal.pendingAnnotation) {
            onSaveAnnotation({ ...textInputModal.pendingAnnotation, content: val });
        } else if (textInputModal.pendingComment) {
            onSaveAnnotation(textInputModal.pendingComment(val));
        }
        setTextInputModal(null);
        setCurrentAnnotation(null);
        setTextInputValue('');
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onVisible(pageNumber);
                }
            },
            { threshold: 0.5 }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [pageNumber, onVisible]);

    useEffect(() => {
        const renderPage = async () => {
            if (!pdf) return;
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: zoom });
            const canvas = canvasRef.current;
            if (!canvas) return;
            const context = canvas.getContext('2d');

            const pixelRatio = window.devicePixelRatio || 1;
            canvas.width = viewport.width * pixelRatio;
            canvas.height = viewport.height * pixelRatio;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;

            if (containerRef.current) {
                containerRef.current.style.width = `${viewport.width}px`;
                containerRef.current.style.height = `${viewport.height}px`;
            }

            if (overlayRef.current) {
                overlayRef.current.style.width = `${viewport.width}px`;
                overlayRef.current.style.height = `${viewport.height}px`;
            }

            if (renderTaskRef.current) renderTaskRef.current.cancel();
            renderTaskRef.current = page.render({
                canvasContext: context,
                viewport: viewport,
                transform: [pixelRatio, 0, 0, pixelRatio, 0, 0]
            });
            try {
                await renderTaskRef.current.promise;
            } catch (err) {
                if (err.name !== 'RenderingCancelledException') console.error(err);
            }
        };

        renderPage();
    }, [pdf, pageNumber, zoom]);

    const getCoordinates = (e) => {
        const rect = overlayRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom
        };
    };

    const handleMouseDown = (e) => {
        if (!activeTool || activeTool === 'comment') return;
        const coords = getCoordinates(e);

        if (activeTool === 'pen') {
            setIsDrawing(true);
            penPointsRef.current = [{ x: coords.x, y: coords.y }];
            setCurrentAnnotation({
                type: 'pen',
                pageNumber,
                coordinates: {
                    points: [{ x: coords.x, y: coords.y }],
                    penColor: penColor,
                    penWidth: penWidth
                },
                drawingId,
                versionId
            });
            return;
        }

        setIsDrawing(true);
        setCurrentAnnotation({
            type: activeTool,
            pageNumber,
            coordinates: { x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y },
            drawingId,
            versionId
        });
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !currentAnnotation) return;
        const coords = getCoordinates(e);

        if (activeTool === 'pen') {
            penPointsRef.current.push({ x: coords.x, y: coords.y });
            setCurrentAnnotation(prev => ({
                ...prev,
                coordinates: { ...prev.coordinates, points: [...penPointsRef.current] }
            }));
            return;
        }

        setCurrentAnnotation(prev => ({
            ...prev,
            coordinates: { ...prev.coordinates, x2: coords.x, y2: coords.y }
        }));
    };

    const handleMouseUp = async () => {
        if (!isDrawing || !currentAnnotation) return;
        setIsDrawing(false);

        if (activeTool === 'pen') {
            const points = penPointsRef.current;
            if (points.length < 2) {
                setCurrentAnnotation(null);
                penPointsRef.current = [];
                return;
            }
            onSaveAnnotation({
                ...currentAnnotation,
                coordinates: {
                    ...currentAnnotation.coordinates,
                    points
                },
                content: `Pen drawing (${points.length} points)`
            });
            setCurrentAnnotation(null);
            penPointsRef.current = [];
            return;
        }

        const { x1, y1, x2, y2 } = currentAnnotation.coordinates;
        if (Math.abs(x2 - x1) < 2 && Math.abs(y2 - y1) < 2) {
            setCurrentAnnotation(null);
            return;
        }

        if (activeTool === 'text' || activeTool === 'box') {
            setTextInputValue('');
            setTextInputModal({ pendingAnnotation: currentAnnotation, toolType: activeTool });
            setIsDrawing(false);
            // Don't clear currentAnnotation yet — keep the preview until confirmed
        } else {
            onSaveAnnotation(currentAnnotation);
            setCurrentAnnotation(null);
        }
    };

    const handleCommentClick = (e) => {
        if (activeTool !== 'comment') return;
        const coords = getCoordinates(e);
        setTextInputValue('');
        setTextInputModal({
            pendingComment: (val) => ({
                drawingId,
                versionId,
                type: 'comment',
                pageNumber,
                coordinates: { x: coords.x, y: coords.y },
                content: val
            })
        });
    };

    // Build an SVG path string from an array of points
    const buildSvgPath = (points) => {
        if (!points || points.length < 2) return '';
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
        }
        return d;
    };

    const renderResizeHandles = (ann, isSelected) => {
        if (!isSelected) return null;
        const hSize = Math.max(8, 8 * zoom);
        const offset = -(hSize / 2);
        
        const handleStyle = {
            position: 'absolute',
            width: `${hSize}px`,
            height: `${hSize}px`,
            background: ann.type === 'highlight' ? '#3b82f6' : '#2563eb',
            border: `${Math.max(1, 1.5 * zoom)}px solid #ffffff`,
            borderRadius: '50%',
            zIndex: 40,
            boxSizing: 'border-box'
        };

        const handleSpecs = [
            { type: 'tl', style: { top: offset, left: offset, cursor: 'nwse-resize' } },
            { type: 'tr', style: { top: offset, right: offset, cursor: 'nesw-resize' } },
            { type: 'bl', style: { bottom: offset, left: offset, cursor: 'nesw-resize' } },
            { type: 'br', style: { bottom: offset, right: offset, cursor: 'nwse-resize' } },
            { type: 't', style: { top: offset, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
            { type: 'b', style: { bottom: offset, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
            { type: 'l', style: { top: '50%', left: offset, transform: 'translateY(-50%)', cursor: 'ew-resize' } },
            { type: 'r', style: { top: '50%', right: offset, transform: 'translateY(-50%)', cursor: 'ew-resize' } }
        ];

        return handleSpecs.map(h => (
            <div
                key={h.type}
                onMouseDown={(e) => handleResizeStart(ann, h.type, e)}
                style={{ ...handleStyle, ...h.style }}
            />
        ));
    };

    const renderAnnotation = (ann) => {
        const isSelected = selectedAnnotationId === ann._id;
        const baseStyle = {
            position: 'absolute',
            pointerEvents: 'auto',
            cursor: activeTool ? 'crosshair' : 'grab',
            border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
            zIndex: isSelected ? 30 : 20
        };

        const { x1, y1, x2, y2, x, y, points } = ann.coordinates;

        switch (ann.type) {
            case 'pen':
                if (!points || points.length < 2) return null;
                return (
                    <svg
                        key={ann._id}
                        onMouseDown={(e) => handleAnnotationDragStart(ann, e)}
                        style={{
                            position: 'absolute', left: 0, top: 0,
                            width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none',
                            zIndex: isSelected ? 30 : 20
                        }}
                    >
                        <path
                            d={buildSvgPath(points.map(p => ({ x: p.x * zoom, y: p.y * zoom })))}
                            stroke="transparent"
                            strokeWidth={(ann.coordinates.penWidth || ann.penWidth || 3) * zoom + 12}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ pointerEvents: 'auto', cursor: activeTool ? 'crosshair' : 'grab' }}
                        />
                        <path
                            d={buildSvgPath(points.map(p => ({ x: p.x * zoom, y: p.y * zoom })))}
                            stroke={ann.coordinates.penColor || ann.penColor || '#ef4444'}
                            strokeWidth={(ann.coordinates.penWidth || ann.penWidth || 3) * zoom}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ pointerEvents: 'none' }}
                        />
                        {isSelected && (
                            <path
                                d={buildSvgPath(points.map(p => ({ x: p.x * zoom, y: p.y * zoom })))}
                                stroke="#3b82f6"
                                strokeWidth={((ann.coordinates.penWidth || ann.penWidth || 3) + 4) * zoom}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.25}
                                style={{ pointerEvents: 'none' }}
                            />
                        )}
                    </svg>
                );
            case 'box':
                return (
                    <div
                        key={ann._id}
                        onMouseDown={(e) => handleAnnotationDragStart(ann, e)}
                        onDoubleClick={(e) => handleTextEdit(ann, e)}
                        title={ann.content ? `${ann.content} — Double click to edit` : 'Double click to add label'}
                        style={{
                            ...baseStyle,
                            left: `${Math.min(x1, x2) * zoom}px`,
                            top: `${Math.min(y1, y2) * zoom}px`,
                            width: `${Math.abs(x2 - x1) * zoom}px`,
                            minHeight: `${Math.abs(y2 - y1) * zoom}px`,
                            height: 'auto',
                            background: 'transparent',
                            border: isSelected ? '2px solid #2563eb' : '2px solid #3b82f6',
                            overflow: 'visible',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: `${6 * zoom}px`,
                            boxSizing: 'border-box'
                        }}
                    >
                        {ann.content && (
                            <span style={{
                                fontSize: `${Math.max(10, 11 * zoom)}px`,
                                fontWeight: 'bold',
                                color: '#3b82f6',
                                pointerEvents: 'none',
                                width: '100%',
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'break-word',
                                wordBreak: 'break-word',
                                lineHeight: '1.2'
                            }}>{ann.content}</span>
                        )}
                        {renderResizeHandles(ann, isSelected)}
                    </div>
                );
            case 'highlight':
                return (
                    <div
                        key={ann._id}
                        onMouseDown={(e) => handleAnnotationDragStart(ann, e)}
                        style={{
                            ...baseStyle,
                            left: `${Math.min(x1, x2) * zoom}px`,
                            top: `${Math.min(y1, y2) * zoom}px`,
                            width: `${Math.abs(x2 - x1) * zoom}px`,
                            height: `${Math.abs(y2 - y1) * zoom}px`,
                            background: 'rgba(234, 179, 8, 0.3)',
                            border: isSelected ? '2px solid #3b82f6' : 'none',
                            overflow: 'visible'
                        }}
                    >
                        {renderResizeHandles(ann, isSelected)}
                    </div>
                );
            case 'arrow':
                return (
                    <svg
                        key={ann._id}
                        onMouseDown={(e) => handleAnnotationDragStart(ann, e)}
                        style={{
                            position: 'absolute', left: 0, top: 0,
                            width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none',
                            zIndex: isSelected ? 30 : 20
                        }}
                    >
                        <defs>
                            <marker id={`arrowhead-${ann._id}`} markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                            </marker>
                        </defs>
                        <line
                            x1={x1 * zoom} y1={y1 * zoom}
                            x2={x2 * zoom} y2={y2 * zoom}
                            stroke="transparent" strokeWidth="12"
                            style={{ pointerEvents: 'auto', cursor: activeTool ? 'crosshair' : 'grab' }}
                        />
                        <line
                            x1={x1 * zoom} y1={y1 * zoom}
                            x2={x2 * zoom} y2={y2 * zoom}
                            stroke="#ef4444" strokeWidth={isSelected ? "3" : "2"}
                            markerEnd={`url(#arrowhead-${ann._id})`}
                            style={{ pointerEvents: 'none' }}
                        />
                    </svg>
                );
            case 'line':
                return (
                    <svg
                        key={ann._id}
                        onMouseDown={(e) => handleAnnotationDragStart(ann, e)}
                        style={{
                            position: 'absolute', left: 0, top: 0,
                            width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none',
                            zIndex: isSelected ? 30 : 20
                        }}
                    >
                        <line
                            x1={x1 * zoom} y1={y1 * zoom}
                            x2={x2 * zoom} y2={y2 * zoom}
                            stroke="transparent" strokeWidth="12"
                            style={{ pointerEvents: 'auto', cursor: activeTool ? 'crosshair' : 'grab' }}
                        />
                        <line
                            x1={x1 * zoom} y1={y1 * zoom}
                            x2={x2 * zoom} y2={y2 * zoom}
                            stroke="#ef4444" strokeWidth={isSelected ? "3" : "2"}
                            style={{ pointerEvents: 'none' }}
                        />
                    </svg>
                );
            case 'comment':
                return (
                    <div
                        key={ann._id}
                        onMouseDown={(e) => handleAnnotationDragStart(ann, e)}
                        onDoubleClick={(e) => handleTextEdit(ann, e)}
                        title="Double click to edit comment"
                        style={{
                            ...baseStyle, left: `${x * zoom}px`, top: `${y * zoom}px`,
                            transform: 'translate(-50%, -100%)', border: 'none'
                        }}
                    >
                        <div className={`p-1.5 rounded-full shadow-lg border-2 ${isSelected ? 'bg-blue-600 border-white text-white' : 'bg-white border-blue-600 text-blue-600'}`}>
                            <MessageSquare size={16} />
                        </div>
                    </div>
                );
            case 'text':
                return (
                    <div
                        key={ann._id}
                        onMouseDown={(e) => handleAnnotationDragStart(ann, e)}
                        onDoubleClick={(e) => handleTextEdit(ann, e)}
                        title="Double click to edit note"
                        style={{
                            ...baseStyle,
                            border: 'none',
                            left: `${x1 * zoom}px`,
                            top: `${y1 * zoom}px`,
                            color: '#3b82f6',
                            fontWeight: 'bold',
                            fontSize: `${12 * zoom}px`,
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'break-word',
                            wordBreak: 'break-word',
                            maxWidth: `${250 * zoom}px`
                        }}
                    >
                        {ann.content}
                    </div>
                );
            default: return null;
        }
    };

    // Render the live pen stroke being drawn
    const renderCurrentPenStroke = () => {
        if (!currentAnnotation || currentAnnotation.type !== 'pen') return null;
        const points = currentAnnotation.coordinates?.points;
        if (!points || points.length < 2) return null;
        return (
            <svg
                style={{
                    position: 'absolute', left: 0, top: 0,
                    width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 50
                }}
            >
                <path
                    d={buildSvgPath(points.map(p => ({ x: p.x * zoom, y: p.y * zoom })))}
                    stroke={penColor}
                    strokeWidth={penWidth * zoom}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                />
            </svg>
        );
    };

    // Render the live shape being drawn (non-pen)
    const renderCurrentShape = () => {
        if (!currentAnnotation || currentAnnotation.type === 'pen') return null;
        const { x1, y1, x2, y2 } = currentAnnotation.coordinates;

        if (currentAnnotation.type === 'arrow') {
            return (
                <svg
                    style={{
                        position: 'absolute', left: 0, top: 0,
                        width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 50
                    }}
                >
                    <defs>
                        <marker id="arrowhead-current" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                        </marker>
                    </defs>
                    <line
                        x1={x1 * zoom} y1={y1 * zoom}
                        x2={x2 * zoom} y2={y2 * zoom}
                        stroke="#ef4444" strokeWidth="2"
                        markerEnd="url(#arrowhead-current)"
                    />
                </svg>
            );
        }

        if (currentAnnotation.type === 'line') {
            return (
                <svg
                    style={{
                        position: 'absolute', left: 0, top: 0,
                        width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 50
                    }}
                >
                    <line
                        x1={x1 * zoom} y1={y1 * zoom}
                        x2={x2 * zoom} y2={y2 * zoom}
                        stroke="#ef4444" strokeWidth="2"
                    />
                </svg>
            );
        }

        return (
            <div style={{
                position: 'absolute',
                left: `${Math.min(x1, x2) * zoom}px`,
                top: `${Math.min(y1, y2) * zoom}px`,
                width: `${Math.abs(x2 - x1) * zoom}px`,
                height: `${Math.abs(y2 - y1) * zoom}px`,
                border: activeTool === 'highlight'
                    ? '2px dashed #eab308'
                    : '2px dashed #3b82f6',
                background: activeTool === 'highlight' ? 'rgba(234, 179, 8, 0.2)' : 'transparent'
            }} />
        );
    };

    return (
        <>
        <div ref={containerRef} className="relative mb-8 mx-auto shadow-2xl bg-white rounded-sm h-fit">
            <canvas ref={canvasRef} className="rounded-sm" />
            <div
                ref={overlayRef}
                className={`absolute inset-0 z-40 ${activeTool ? 'cursor-crosshair' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleCommentClick}
            >
                {annotations.filter(a => a.pageNumber === pageNumber).map(renderAnnotation)}
                {renderCurrentPenStroke()}
                {renderCurrentShape()}
            </div>
        </div>

        {/* Inline Text Input Modal */}
        {textInputModal && (
            <div
                className="fixed inset-0 z-[999] flex items-center justify-center"
                style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
                onClick={(e) => { if (e.target === e.currentTarget) { setTextInputModal(null); setCurrentAnnotation(null); setTextInputValue(''); } }}
            >
                <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8 flex flex-col gap-5 border border-slate-100 animate-in zoom-in duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Type size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 tracking-tight">
                                {textInputModal.editingAnn
                                    ? 'Edit Annotation'
                                    : textInputModal.toolType === 'box'
                                    ? 'Add Box Label (Optional)'
                                    : 'Add Annotation'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {textInputModal.editingAnn
                                    ? 'Update the text below'
                                    : textInputModal.toolType === 'box'
                                    ? 'Add a label to your box, or skip'
                                    : 'Enter your note or comment'}
                            </p>
                        </div>
                    </div>
                    <textarea
                        autoFocus
                        value={textInputValue}
                        onChange={(e) => setTextInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextInputConfirm(); } if (e.key === 'Escape') { setTextInputModal(null); setCurrentAnnotation(null); setTextInputValue(''); } }}
                        placeholder="Type your annotation here..."
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 resize-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400 font-bold -mt-2">Press Enter to confirm · Shift+Enter for new line · Esc to cancel</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setTextInputModal(null); setCurrentAnnotation(null); setTextInputValue(''); }}
                            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >Cancel</button>
                        {textInputModal.toolType === 'box' && (
                            <button
                                onClick={() => handleTextInputConfirm(true)}
                                className="flex-1 py-3 rounded-2xl bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                            >Skip Label</button>
                        )}
                        <button
                            onClick={() => handleTextInputConfirm(false)}
                            disabled={textInputModal.toolType !== 'box' && !textInputValue.trim()}
                            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                        >
                            {textInputModal.editingAnn ? 'Update' : 'Add'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
});

const DrawingViewer = ({ drawing, version, onClose }) => {
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoom, setZoom] = useState(1.5);
    const [pdf, setPdf] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTool, setActiveTool] = useState(null);
    const [annotations, setAnnotations] = useState([]);
    const [showComments, setShowComments] = useState(true);
    const [showThumbnails, setShowThumbnails] = useState(true);
    const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
    const [exportProgress, setExportProgress] = useState(0);

    // Pen tool options
    const [penColor, setPenColor] = useState('#ef4444');
    const [penWidth, setPenWidth] = useState(3);
    const [showPenOptions, setShowPenOptions] = useState(false);

    const [isFitWidth, setIsFitWidth] = useState(true);

    const containerRef = useRef(null);
    const pageRefs = useRef({});

    const recalculateZoomForFitWidth = useCallback(async () => {
        if (!pdf || !containerRef.current) return;
        try {
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });
            const containerWidth = containerRef.current.clientWidth;
            const availableWidth = containerWidth - 64; // subtract p-8 padding on left and right (32px * 2)
            if (availableWidth > 0) {
                const calculatedZoom = availableWidth / viewport.width;
                setZoom(Math.round(calculatedZoom * 100) / 100);
            }
        } catch (err) {
            console.error('Error recalculating zoom:', err);
        }
    }, [pdf]);

    useEffect(() => {
        if (isFitWidth) {
            // Wait 350ms for the 300ms CSS sidebar transition to complete before measuring
            const timer = setTimeout(() => {
                recalculateZoomForFitWidth();
            }, 350);
            return () => clearTimeout(timer);
        }
    }, [pdf, showThumbnails, showComments, isFitWidth, recalculateZoomForFitWidth]);

    useEffect(() => {
        if (!isFitWidth) return;
        const handleResize = () => {
            recalculateZoomForFitWidth();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isFitWidth, recalculateZoomForFitWidth]);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                setLoading(true);
                const url = getServerUrl(version.fileUrl);
                const loadingTask = pdfjsLib.getDocument(url);
                const pdfInstance = await loadingTask.promise;
                setPdf(pdfInstance);
                setNumPages(pdfInstance.numPages);

                const annRes = await api.get(`/drawings/${drawing._id}/annotations`, {
                    params: { versionId: version._id }
                });
                setAnnotations(annRes.data);
            } catch (err) {
                console.error('Error loading PDF:', err);
                alert(`Failed to load PDF: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        if (version?.fileUrl) loadPdf();
    }, [drawing._id, version]);

    const handleSaveAnnotation = async (data) => {
        try {
            const res = await api.post(`/drawings/${drawing._id}/annotations`, data);
            setAnnotations([...annotations, res.data]);
        } catch (err) {
            console.error('Error saving annotation:', err);
        }
    };

    const handleUpdateAnnotationLocally = useCallback((id, updatedCoords, newContent) => {
        setAnnotations(prev => prev.map(ann => {
            if (ann._id === id) {
                const updated = { ...ann };
                if (updatedCoords) updated.coordinates = updatedCoords;
                if (newContent !== undefined) updated.content = newContent;
                return updated;
            }
            return ann;
        }));
    }, []);

    const handleUpdateAnnotation = useCallback(async (id, data) => {
        try {
            const res = await api.patch(`/drawings/annotations/${id}`, data);
            setAnnotations(prev => prev.map(ann => (ann._id === id ? res.data : ann)));
        } catch (err) {
            console.error('Error updating annotation:', err);
        }
    }, []);

    const handleDeleteAnnotation = async (id, e) => {
        e?.stopPropagation();
        try {
            await api.delete(`/drawings/annotations/${id}`);
            setAnnotations(annotations.filter(a => a._id !== id));
            if (selectedAnnotationId === id) setSelectedAnnotationId(null);
        } catch (err) {
            console.error('Error deleting annotation:', err);
        }
    };

    const scrollToPage = (pageNum) => {
        const pageEl = pageRefs.current[pageNum];
        if (pageEl) {
            pageEl.scrollIntoView({ behavior: 'smooth' });
            setCurrentPage(pageNum);
        }
    };

    const handleExportPDF = async () => {
        if (!pdf) return;
        try {
            setLoading(true);
            const exportScale = 1.5;
            const firstPage = await pdf.getPage(1);
            const firstViewport = firstPage.getViewport({ scale: exportScale });

            const doc = new jsPDF({
                orientation: firstViewport.width > firstViewport.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [firstViewport.width, firstViewport.height],
                compress: true
            });

            for (let i = 1; i <= numPages; i++) {
                setExportProgress(Math.round((i / numPages) * 100));
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: exportScale });
                if (i > 1) doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'landscape' : 'portrait');
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height; canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport }).promise;

                const pageAnns = annotations.filter(a => a.pageNumber === i);
                pageAnns.forEach(ann => {
                    const s = exportScale;
                    const { x1, y1, x2, y2, x, y, points } = ann.coordinates;
                    context.lineWidth = 2 * s;

                    if (ann.type === 'pen' && points && points.length >= 2) {
                        // Draw freehand pen stroke
                        context.strokeStyle = ann.coordinates.penColor || ann.penColor || '#ef4444';
                        context.lineWidth = (ann.coordinates.penWidth || ann.penWidth || 3) * s;
                        context.lineCap = 'round';
                        context.lineJoin = 'round';
                        context.beginPath();
                        context.moveTo(points[0].x * s, points[0].y * s);
                        for (let j = 1; j < points.length; j++) {
                            context.lineTo(points[j].x * s, points[j].y * s);
                        }
                        context.stroke();
                    } else if (ann.type === 'box') {
                        context.strokeStyle = '#3b82f6';
                        const bx = Math.min(x1, x2) * s;
                        const by = Math.min(y1, y2) * s;
                        const bw = Math.abs(x2 - x1) * s;
                        let bh = Math.abs(y2 - y1) * s;

                        let textLines = [];
                        let totalHeight = 0;
                        const paddingX = 6 * s;
                        const paddingY = 6 * s;
                        const lineHeight = 14 * s;

                        if (ann.content) {
                            context.font = `bold ${11 * s}px Arial`;
                            textLines = ann.content.split('\n');
                            totalHeight = textLines.length * lineHeight;
                            const requiredHeight = totalHeight + paddingY * 2;
                            if (requiredHeight > bh) {
                                bh = requiredHeight;
                            }
                        }

                        // Draw the box (with potentially expanded height)
                        context.strokeRect(bx, by, bw, bh);

                        // Draw text lines inside the box
                        if (ann.content) {
                            context.fillStyle = '#3b82f6';
                            textLines.forEach((line, index) => {
                                context.fillText(line, bx + paddingX, by + paddingY + (index + 1) * lineHeight - 2 * s);
                            });
                        }
                    } else if (ann.type === 'highlight') {
                        context.fillStyle = 'rgba(234, 179, 8, 0.4)';
                        context.fillRect(Math.min(x1, x2) * s, Math.min(y1, y2) * s, Math.abs(x2 - x1) * s, Math.abs(y2 - y1) * s);
                    } else if (ann.type === 'arrow') {
                        context.strokeStyle = '#ef4444'; context.beginPath();
                        context.moveTo(x1 * s, y1 * s); context.lineTo(x2 * s, y2 * s); context.stroke();
                        const angle = Math.atan2((y2 - y1) * s, (x2 - x1) * s);
                        context.beginPath(); context.moveTo(x2 * s, y2 * s);
                        const arrowSize = 8 * s;
                        context.lineTo(x2 * s - arrowSize * Math.cos(angle - Math.PI / 6), y2 * s - arrowSize * Math.sin(angle - Math.PI / 6));
                        context.lineTo(x2 * s - arrowSize * Math.cos(angle + Math.PI / 6), y2 * s - arrowSize * Math.sin(angle + Math.PI / 6));
                        context.closePath(); context.fillStyle = '#ef4444'; context.fill();
                    } else if (ann.type === 'line') {
                        context.strokeStyle = '#ef4444'; context.beginPath();
                        context.moveTo(x1 * s, y1 * s); context.lineTo(x2 * s, y2 * s); context.stroke();
                    } else if (ann.type === 'text' || ann.type === 'comment') {
                        context.fillStyle = '#3b82f6';
                        context.font = `bold ${12 * s}px Arial`;
                        const text = ann.content || (ann.type === 'comment' ? 'Comment' : 'Note');
                        const lines = text.split('\n');
                        const lineHeight = 15 * s;
                        lines.forEach((line, index) => {
                            context.fillText(line, (x || x1) * s, (y || y1) * s + index * lineHeight);
                        });
                    }
                });

                doc.addImage(canvas.toDataURL('image/jpeg', 0.5), 'JPEG', 0, 0, viewport.width, viewport.height, undefined, 'FAST');
            }
            doc.save(`${drawing.title}_reviewed_${Date.now()}.pdf`);
        } catch (err) {
            console.error('Export error:', err);
            alert(`Failed to export PDF: ${err.message}`);
        } finally {
            setLoading(false); setExportProgress(0);
        }
    };

    // Toggle pen tool and show/hide options panel
    const handlePenToolClick = () => {
        if (activeTool === 'pen') {
            setActiveTool(null);
            setShowPenOptions(false);
        } else {
            setActiveTool('pen');
            setShowPenOptions(true);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[60] flex flex-col text-white overflow-hidden animate-fade-in">
            {/* Toolbar */}
            <div className="h-16 bg-slate-800 border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition"><X size={20} /></button>
                    <button onClick={() => setShowThumbnails(!showThumbnails)} className={`p-2 rounded-lg transition ${showThumbnails ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-slate-400'}`} title="Toggle Page Thumbnails">
                        <PanelLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-sm font-bold truncate max-w-[200px]">{drawing.title}</h2>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Version {version.versionNumber}.0</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-white/10 relative">
                    {[
                        { id: 'highlight', icon: Highlighter, label: 'Highlight' },
                        { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
                        { id: 'line', icon: Minus, label: 'Line' },
                        { id: 'box', icon: Square, label: 'Box' },
                        { id: 'pen', icon: Pencil, label: 'Pen / Freehand Draw' },
                        { id: 'text', icon: Type, label: 'Text' },
                        { id: 'comment', icon: MessageSquare, label: 'Comment' },
                    ].map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => {
                                if (tool.id === 'pen') {
                                    handlePenToolClick();
                                } else {
                                    setActiveTool(activeTool === tool.id ? null : tool.id);
                                    setShowPenOptions(false);
                                }
                            }}
                            className={`p-2.5 rounded-lg transition relative ${activeTool === tool.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400'}`}
                            title={tool.label}
                        >
                            <tool.icon size={18} />
                        </button>
                    ))}

                    {/* Pen Options Dropdown */}
                    {showPenOptions && activeTool === 'pen' && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-800 border border-white/15 rounded-2xl shadow-2xl p-4 z-[100] min-w-[240px] animate-fade-in">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pen Color</div>
                            <div className="flex gap-2 mb-4">
                                {PEN_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setPenColor(c.value)}
                                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${penColor === c.value ? 'border-white scale-110 ring-2 ring-blue-500/50' : 'border-transparent'}`}
                                        style={{ background: c.value }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Stroke Width</div>
                            <div className="flex items-center gap-3">
                                {PEN_WIDTHS.map(w => (
                                    <button
                                        key={w}
                                        onClick={() => setPenWidth(w)}
                                        className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${penWidth === w ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'}`}
                                        title={`${w}px`}
                                    >
                                        <div className="rounded-full bg-current" style={{ width: `${w + 2}px`, height: `${w + 2}px` }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition"><Download size={16} /> Export PDF</button>

                    <button 
                        onClick={() => {
                            setIsFitWidth(true);
                            recalculateZoomForFitWidth();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isFitWidth ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900/50 border-white/10 text-slate-400 hover:text-white'}`}
                        title="Fit Drawing to Screen Width"
                    >
                        Fit Width
                    </button>

                    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/10">
                        <button onClick={() => { setIsFitWidth(false); setZoom(z => Math.max(0.25, z - 0.25)); }} className="p-1 hover:text-blue-400"><ZoomOut size={16} /></button>
                        <span className="text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => { setIsFitWidth(false); setZoom(z => Math.min(4, z + 0.25)); }} className="p-1 hover:text-blue-400"><ZoomIn size={16} /></button>
                    </div>

                    <div className="flex items-center gap-2 min-w-[80px] justify-center">
                        <span className="text-xs font-bold">{currentPage} / {numPages}</span>
                    </div>

                    <button 
                        onClick={() => setShowComments(!showComments)} 
                        className={`p-2 rounded-lg transition ${showComments ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-slate-400'}`} 
                        title="Toggle Review Notes"
                    >
                        <PanelRight size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Thumbnail Sidebar - CSS transition slide */}
                <div className={`bg-slate-800/50 border-r border-white/10 overflow-y-auto custom-scrollbar p-4 space-y-4 shrink-0 transition-all duration-300 ease-in-out overflow-x-hidden ${
                    showThumbnails ? 'w-56 opacity-100' : 'w-0 p-0 border-r-0 opacity-0'
                }`}>
                    {Array.from({ length: numPages }, (_, i) => (
                        <div 
                            key={i + 1} 
                            onClick={() => scrollToPage(i + 1)}
                            className={`aspect-[3/4] rounded-lg border-2 cursor-pointer transition-all hover:border-blue-400 relative group overflow-hidden
                                ${currentPage === i + 1 ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-white/5 bg-slate-900/50'}`}
                        >
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-500 opacity-20 group-hover:opacity-40 transition">PAGE {i + 1}</div>
                            <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 rounded text-[8px] font-black text-white">{i + 1}</div>
                        </div>
                    ))}
                </div>

                {/* PDF Scroll Area */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-auto bg-slate-950 flex flex-col p-8 custom-scrollbar relative scroll-smooth"
                >
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                            <span className="text-xs font-black text-white uppercase tracking-widest">{exportProgress > 0 ? `Exporting: ${exportProgress}%` : 'Loading PDF...'}</span>
                        </div>
                    )}
                    
                    {Array.from({ length: numPages }, (_, i) => (
                        <div key={i + 1} ref={el => pageRefs.current[i + 1] = el}>
                            <DrawingPage 
                                pdf={pdf}
                                pageNumber={i + 1}
                                zoom={zoom}
                                annotations={annotations}
                                activeTool={activeTool}
                                onSaveAnnotation={handleSaveAnnotation}
                                onDeleteAnnotation={handleDeleteAnnotation}
                                selectedAnnotationId={selectedAnnotationId}
                                setSelectedAnnotationId={setSelectedAnnotationId}
                                drawingId={drawing._id}
                                versionId={version._id}
                                onVisible={setCurrentPage}
                                penColor={penColor}
                                penWidth={penWidth}
                                onUpdateAnnotationLocally={handleUpdateAnnotationLocally}
                                onUpdateAnnotation={handleUpdateAnnotation}
                            />
                        </div>
                    ))}
                </div>

                {/* Annotation Sidebar - CSS transition slide */}
                <div className={`bg-slate-800 border-l border-white/10 flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
                    showComments ? 'w-80 opacity-100' : 'w-0 border-l-0 opacity-0'
                }`}>
                    <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Review Notes ({annotations.length})</span>
                        <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {annotations.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <MessageSquare className="mx-auto mb-2 opacity-20" size={32} />
                                <p className="text-xs font-bold uppercase tracking-widest">No markups yet</p>
                            </div>
                        ) : (
                            annotations.map(ann => (
                                <div
                                    key={ann._id}
                                    onClick={() => {
                                        scrollToPage(ann.pageNumber);
                                        setSelectedAnnotationId(ann._id);
                                    }}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${selectedAnnotationId === ann._id ? 'bg-blue-600/10 border-blue-500/50' : 'bg-slate-900/30 border-white/5 hover:border-white/10'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {ann.type === 'pen' && (
                                                <span className="w-3 h-3 rounded-full inline-block" style={{ background: ann.coordinates.penColor || ann.penColor || '#ef4444' }} />
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page {ann.pageNumber}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{ann.type}</span>
                                        </div>
                                        <button onClick={(e) => handleDeleteAnnotation(ann._id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition"><Trash2 size={12} /></button>
                                    </div>
                                    <p className="text-sm font-medium text-slate-200 line-clamp-3">{ann.content || `A ${ann.type} markup added.`}</p>
                                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                                        <span className="font-bold text-blue-400">@{ann.userId?.fullName?.split(' ')[0]}</span>
                                        <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DrawingViewer;

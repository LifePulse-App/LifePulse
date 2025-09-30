#import "NVActivityIndicatorAnimationTriangleSkewSpin.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationTriangleSkewSpin

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    CFTimeInterval duration = 3.0 / speedMultiplier;
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.09 :0.57 :0.49 :0.9];
    
    // Animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"transform"];
    animation.keyTimes = @[@0, @0.25, @0.5, @0.75, @1];
    animation.timingFunctions = @[timingFunction, timingFunction, timingFunction, timingFunction];
    animation.values = @[
        [NSValue valueWithCATransform3D:CATransform3DConcat([self createRotateXTransformWithAngle:0], [self createRotateYTransformWithAngle:0])],
        [NSValue valueWithCATransform3D:CATransform3DConcat([self createRotateXTransformWithAngle:M_PI], [self createRotateYTransformWithAngle:0])],
        [NSValue valueWithCATransform3D:CATransform3DConcat([self createRotateXTransformWithAngle:M_PI], [self createRotateYTransformWithAngle:M_PI])],
        [NSValue valueWithCATransform3D:CATransform3DConcat([self createRotateXTransformWithAngle:0], [self createRotateYTransformWithAngle:M_PI])],
        [NSValue valueWithCATransform3D:CATransform3DConcat([self createRotateXTransformWithAngle:0], [self createRotateYTransformWithAngle:0])]
    ];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw triangle
    CALayer *triangle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeTriangle 
                                                                   size:size 
                                                                  color:color];
    triangle.frame = CGRectMake(x, y, size.width, size.height);
    [triangle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:triangle];
}

- (CATransform3D)createRotateXTransformWithAngle:(CGFloat)angle {
    CATransform3D transform = CATransform3DMakeRotation(angle, 1, 0, 0);
    transform.m34 = -1.0 / 100.0;
    return transform;
}

- (CATransform3D)createRotateYTransformWithAngle:(CGFloat)angle {
    CATransform3D transform = CATransform3DMakeRotation(angle, 0, 1, 0);
    transform.m34 = -1.0 / 100.0;
    return transform;
}

@end
